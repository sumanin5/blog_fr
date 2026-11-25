#!/usr/bin/env python3
"""
本地内容目录监听与自动同步脚本（Option 1）。

定位：
- 在 Windows / macOS / Linux 宿主机运行，稳定监听外部或本地内容目录（如 D:/project/python/blog/blog-content），
  绕开 Docker Desktop 跨文件系统挂载下 inotify 失效问题。
- 检测到文件变化并防抖后，先执行契约校验与 MDX 编译预检；
  全部通过才把实际变动文章同步进容器/本地数据库并触发前端缓存刷新，
  避免写到一半保存草稿时污染本地预览页。

用法：
    python scripts/watch_content.py
    python scripts/watch_content.py --content-dir D:/project/python/blog/blog-content
    python scripts/watch_content.py --once
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import time
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = REPO_ROOT / "frontend"
BACKEND_DIR = REPO_ROOT / "backend"
REGISTRY_PATH = (
    FRONTEND_DIR / "src" / "components" / "public" / "mdx" / "registry" / "mdx-components.tsx"
)
CONTRACT_SCRIPT_FALLBACK = BACKEND_DIR / "app" / "git_ops" / "content_contract.py"

CONTENT_EXTENSIONS = {".md", ".mdx"}
DOCUMENTS = {"README", "AGENTS", "CLAUDE", "LICENSE", "CONTRIBUTING", "CHANGELOG"}
IGNORED_DIR_NAMES = {"__pycache__", "node_modules", "tools"}
IGNORED_SUFFIXES = (".tmp", ".swp", ".swo", ".bak")

FENCE_RE = re.compile(r"^\s*(```|~~~)")
ENABLE_JSX_RE = re.compile(r"(?im)^enable_jsx\s*:\s*(true|yes|1)\s*$")
JSX_TAG_RE = re.compile(r"<\s*([A-Z][A-Za-z0-9_]*)\b")
REGISTERED_KEY_RE = re.compile(r"^\s+([A-Z][A-Za-z0-9_]*)\s*:", re.MULTILINE)


def read_env_value(env_path: Path, key: str) -> str | None:
    """安全读取 .env 中单个键的值，不打印其余配置与凭据。"""
    if not env_path.is_file():
        return None
    for raw_line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k.strip() != key:
            continue
        val = v.strip().strip('"').strip("'")
        return val or None
    return None


def resolve_content_dir(
    repo_root: Path = REPO_ROOT, explicit_dir: str | None = None
) -> Path:
    """解析待监听的内容根目录：命令行参数 > 环境变量 > .env > 默认 ./content。"""
    raw = (
        explicit_dir
        or os.environ.get("CONTENT_HOST_DIR")
        or read_env_value(repo_root / ".env", "CONTENT_HOST_DIR")
    )
    if raw:
        candidate = Path(raw)
        if not candidate.is_absolute():
            candidate = repo_root / candidate
        return candidate.resolve()
    return (repo_root / "content").resolve()


def resolve_python_executable(repo_root: Path = REPO_ROOT) -> str:
    """优先复用仓库后端虚拟环境内的 Python。"""
    candidates = [
        repo_root / "backend" / ".venv" / "Scripts" / "python.exe",
        repo_root / "backend" / ".venv" / "bin" / "python",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    return sys.executable


def is_ignored_watch_path(rel_posix: str) -> bool:
    """忽略隐藏目录/文件、工具目录及编辑器临时交换文件。"""
    pure = PurePosixPath(rel_posix.replace("\\", "/"))
    parts = pure.parts
    if not parts:
        return True
    if any(part.startswith(".") or part in IGNORED_DIR_NAMES for part in parts):
        return True
    name = pure.name
    if name.startswith("~") or name.endswith("~") or name.lower().endswith(IGNORED_SUFFIXES):
        return True
    return False


def is_article_path(rel_posix: str) -> bool:
    """判断是否为文章或分类索引文件路径（与 content_contract 规则一致）。"""
    pure = PurePosixPath(rel_posix.replace("\\", "/"))
    if pure.suffix.lower() not in CONTENT_EXTENSIONS:
        return False
    if pure.stem.upper() in DOCUMENTS:
        return False
    if any(part.startswith(".") for part in pure.parts):
        return False
    return len(pure.parts) == 3 and pure.parts[0] in {"articles", "ideas"}


def scan_snapshot(content_root: Path) -> dict[str, tuple[int, int]]:
    """递归扫描内容目录，返回 {相对POSIX路径: (mtime_ns, size)}。"""
    snapshot: dict[str, tuple[int, int]] = {}
    if not content_root.exists():
        return snapshot

    def _walk(directory: Path, prefix: str) -> None:
        try:
            with os.scandir(directory) as entries:
                for entry in entries:
                    rel = f"{prefix}/{entry.name}" if prefix else entry.name
                    if is_ignored_watch_path(rel):
                        continue
                    if entry.is_dir(follow_symlinks=False):
                        _walk(Path(entry.path), rel)
                    elif entry.is_file(follow_symlinks=False):
                        try:
                            stat = entry.stat(follow_symlinks=False)
                        except OSError:
                            continue
                        snapshot[rel] = (stat.st_mtime_ns, stat.st_size)
        except OSError:
            return

    _walk(content_root, "")
    return snapshot


def diff_snapshots(
    prev: dict[str, tuple[int, int]],
    curr: dict[str, tuple[int, int]],
) -> list[tuple[str, str]]:
    """对比两次快照得到 [('A'|'M'|'D', rel_path)]。"""
    changes: list[tuple[str, str]] = []
    for path in sorted(set(prev) | set(curr)):
        if path not in prev:
            changes.append(("A", path))
        elif path not in curr:
            changes.append(("D", path))
        elif prev[path] != curr[path]:
            changes.append(("M", path))
    return changes


def plan_sync_changes(
    raw_changes: Iterable[tuple[str, str]],
    content_root: Path,
) -> tuple[bool, list[tuple[str, str]]]:
    """将磁盘文件变更映射为数据库同步动作。

    Returns:
        (requires_full_sync, changed_items)
    """
    mapped: dict[str, str] = {}
    for status, raw_path in raw_changes:
        rel_posix = raw_path.replace("\\", "/")
        pure = PurePosixPath(rel_posix)
        if not pure.parts:
            continue

        # 顶层或任意文章/分类目录外的文档忽略，不触发数据库同步
        if pure.parts[0] not in {"articles", "ideas"} or len(pure.parts) < 3:
            continue

        if len(pure.parts) == 3 and pure.name == "index.md":
            if status in {"A", "D"}:
                return True, []
            mapped[rel_posix] = "M"
            continue

        if is_article_path(rel_posix):
            mapped[rel_posix] = status
            continue

        # 图片/资源文件变动时，刷新同一专栏下的文章以重新生成媒体关联
        category_dir = content_root / pure.parts[0] / pure.parts[1]
        if category_dir.is_dir():
            for child in sorted(category_dir.iterdir()):
                if child.is_file() and child.suffix.lower() in CONTENT_EXTENSIONS:
                    sibling_rel = f"{pure.parts[0]}/{pure.parts[1]}/{child.name}"
                    if is_article_path(sibling_rel) and sibling_rel not in mapped:
                        mapped[sibling_rel] = "M"

    ordered = sorted((status, path) for path, status in mapped.items())
    return False, ordered


def extract_registered_components(registry_path: Path = REGISTRY_PATH) -> set[str]:
    """从 mdx-components.tsx 解析已注册的大写 JSX 组件标签名。"""
    if not registry_path.is_file():
        return set()
    content = registry_path.read_text(encoding="utf-8")
    marker = "export function createMdxComponents"
    idx = content.find(marker)
    section = content[idx:] if idx >= 0 else content
    return set(REGISTERED_KEY_RE.findall(section))


def _needs_mdx_check(path: Path) -> bool:
    if not path.is_file():
        return False
    text = path.read_text(encoding="utf-8", errors="ignore")
    if path.suffix.lower() == ".mdx":
        return True
    lines = text.lstrip("\ufeff").splitlines()
    if not lines or lines[0].strip() != "---":
        return False
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        return False
    frontmatter = "\n".join(lines[1:end])
    return bool(ENABLE_JSX_RE.search(frontmatter))


def find_unregistered_jsx_tags(
    mdx_body: str, registered: set[str]
) -> list[str]:
    """检查围栏代码块之外引用到的大写 JSX 组件是否全部已在注册表中声明。"""
    if not registered:
        return []
    unknown: list[str] = []
    seen: set[str] = set()
    in_fence = False
    for line in mdx_body.splitlines():
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        cleaned = re.sub(r"`[^`]*`", "", line)
        for match in JSX_TAG_RE.finditer(cleaned):
            tag = match.group(1)
            if tag not in registered and tag not in seen:
                seen.add(tag)
                unknown.append(tag)
    return unknown


def run_contract_check(
    content_root: Path, python_exe: str, repo_root: Path = REPO_ROOT
) -> tuple[bool, str]:
    """执行 content_contract.py 契约校验。"""
    script = content_root / "tools" / "content_contract.py"
    if not script.is_file():
        script = repo_root / "backend" / "app" / "git_ops" / "content_contract.py"
        if not script.is_file():
            return True, "未找到 content_contract.py，跳过契约检查。"
        cmd = [python_exe, str(script), str(content_root)]
        cwd = str(repo_root)
    else:
        cmd = [python_exe, str(script)]
        cwd = str(content_root)

    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    output = (proc.stdout or proc.stderr or "").strip()
    return proc.returncode == 0, output


def run_mdx_precheck(
    content_root: Path,
    rel_paths: Iterable[str],
    repo_root: Path = REPO_ROOT,
) -> tuple[bool, str]:
    """调用前端 next-mdx-remote/rsc 对修改过的 MDX 文件做语法与组件白名单预检。"""
    frontend_dir = repo_root / "frontend"
    rsc_entry = frontend_dir / "node_modules" / "next-mdx-remote"
    if not rsc_entry.exists():
        return True, "frontend/node_modules 未就绪，跳过 MDX 编译预检。"

    candidates = [
        content_root / rel
        for rel in rel_paths
        if _needs_mdx_check(content_root / rel)
    ]
    if not candidates:
        return True, ""

    registered = extract_registered_components(
        frontend_dir / "src" / "components" / "public" / "mdx" / "registry" / "mdx-components.tsx"
    )
    for file_path in candidates:
        raw = file_path.read_text(encoding="utf-8")
        body = re.sub(r"^\ufeff?---[\s\S]*?---\s*", "", raw, count=1)
        unknown = find_unregistered_jsx_tags(body, registered)
        if unknown:
            rel_name = file_path.relative_to(content_root).as_posix()
            return False, (
                f"{rel_name}: 发现未注册的 JSX 组件 {', '.join(unknown)} "
                "(请核对 .agent/skills/mdx-components/SKILL.md)"
            )

    node_script = """
import fs from 'node:fs';
import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const files = JSON.parse(fs.readFileSync(0, 'utf8'));
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const body = raw
    .replace(/^\\ufeff?---[\\s\\S]*?---\\s*/, '')
    .replace(/^#\\s+.*\\r?\\n/, '');
  try {
    await compileMDX({
      source: body,
      options: {
        mdxOptions: {
          remarkPlugins: [remarkGfm, remarkMath],
          rehypePlugins: [rehypeKatex],
        },
      },
    });
  } catch (err) {
    console.error(`${file}: ${err?.message || err}`);
    process.exit(1);
  }
}
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", node_script],
        cwd=str(frontend_dir),
        input=json.dumps([str(p) for p in candidates]),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if proc.returncode != 0:
        msg = (proc.stderr or proc.stdout or "MDX 编译失败").strip()
        return False, msg
    return True, f"MDX 预检通过（{len(candidates)} 个文件）"


def detect_docker_backend_running(repo_root: Path = REPO_ROOT) -> bool:
    """检查开发 Docker Compose 中的 backend 容器是否正在运行。"""
    compose_file = repo_root / "docker-compose.dev.yml"
    if not compose_file.is_file():
        return False
    proc = subprocess.run(
        [
            "docker",
            "compose",
            "-f",
            str(compose_file),
            "ps",
            "--status",
            "running",
            "--services",
        ],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return False
    services = {line.strip() for line in proc.stdout.splitlines() if line.strip()}
    return "backend" in services


def build_sync_command(
    *,
    mode: str,
    repo_root: Path,
    content_root: Path,
    python_exe: str,
    requires_full: bool,
    changes: list[tuple[str, str]],
) -> tuple[list[str], dict[str, str] | None, Path]:
    """构造同步子进程命令、环境变量与工作目录。"""
    use_docker = (
        mode == "docker"
        or (mode == "auto" and detect_docker_backend_running(repo_root))
    )

    change_args: list[str] = []
    if not requires_full and changes:
        for status, rel_path in changes:
            change_args.extend(["--change", f"{status}:{rel_path}"])

    if use_docker:
        cmd = [
            "docker",
            "compose",
            "-f",
            "docker-compose.dev.yml",
            "exec",
            "-T",
            "backend",
            "python",
            "scripts/sync_git_content.py",
            *change_args,
        ]
        return cmd, None, repo_root

    env = os.environ.copy()
    env["CONTENT_DIR"] = str(content_root)
    cmd = [python_exe, "scripts/sync_git_content.py", *change_args]
    return cmd, env, repo_root / "backend"


def execute_sync_cycle(
    *,
    repo_root: Path,
    content_root: Path,
    python_exe: str,
    requires_full: bool,
    changes: list[tuple[str, str]],
    mode: str = "auto",
    run_contract: bool = True,
    run_mdx: bool = True,
) -> bool:
    """执行一次：契约校验 -> MDX 编译预检 -> 数据库增量/全量同步。"""
    if run_contract:
        ok, msg = run_contract_check(content_root, python_exe, repo_root)
        if not ok:
            print(f"❌ 契约校验未通过，已跳过入库：\n{msg}", flush=True)
            return False

    if run_mdx:
        mdx_targets = (
            [
                p.relative_to(content_root).as_posix()
                for kind in ("articles", "ideas")
                if (content_root / kind).is_dir()
                for p in (content_root / kind).rglob("*")
                if p.is_file() and is_article_path(p.relative_to(content_root).as_posix())
            ]
            if requires_full
            else [
                rel_path
                for status, rel_path in changes
                if status != "D"
            ]
        )
        ok, msg = run_mdx_precheck(content_root, mdx_targets, repo_root)
        if not ok:
            print(f"❌ MDX 编译预检未通过，已跳过入库（修好保存后会自动重试）：\n{msg}", flush=True)
            return False
        if msg:
            print(f"🧪 {msg}", flush=True)

    cmd, env, cwd = build_sync_command(
        mode=mode,
        repo_root=repo_root,
        content_root=content_root,
        python_exe=python_exe,
        requires_full=requires_full,
        changes=changes,
    )
    proc = subprocess.run(cmd, cwd=str(cwd), env=env)
    return proc.returncode == 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="本地内容目录监听与自动预检同步工具（宿主机运行）"
    )
    parser.add_argument("--content-dir", help="显式指定内容仓库目录，默认读取 .env 中的 CONTENT_HOST_DIR")
    parser.add_argument("--debounce", type=float, default=1.5, help="防抖等待秒数（默认 1.5s）")
    parser.add_argument("--interval", type=float, default=1.0, help="目录轮询间隔秒数（默认 1.0s）")
    parser.add_argument(
        "--mode",
        choices=("auto", "docker", "local"),
        default="auto",
        help="同步目标执行方式（默认 auto：自动识别运行中的 Docker backend 容器）",
    )
    parser.add_argument("--no-contract-check", action="store_true", help="跳过 content_contract.py 检查")
    parser.add_argument("--no-mdx-check", action="store_true", help="跳过 MDX 编译与标签检查")
    parser.add_argument("--once", action="store_true", help="仅执行一次校验与全量同步后退出")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    content_root = resolve_content_dir(REPO_ROOT, args.content_dir)
    python_exe = resolve_python_executable(REPO_ROOT)

    if not content_root.is_dir():
        print(f"❌ 内容目录不存在: {content_root}", file=sys.stderr)
        return 1

    print(f"👀 正在监听内容目录: {content_root}")
    print(
        f"⚙️  模式: {args.mode} | 防抖: {args.debounce:.1f}s | 轮询: {args.interval:.1f}s | "
        f"MDX 预检: {'关闭' if args.no_mdx_check else '开启'}"
    )

    if args.once:
        ok = execute_sync_cycle(
            repo_root=REPO_ROOT,
            content_root=content_root,
            python_exe=python_exe,
            requires_full=True,
            changes=[],
            mode=args.mode,
            run_contract=not args.no_contract_check,
            run_mdx=not args.no_mdx_check,
        )
        return 0 if ok else 1

    snapshot = scan_snapshot(content_root)
    print(f"✅ 初始快照完成（共跟踪 {len(snapshot)} 个文件），修改保存任意文章/配图即可自动增量入库。按 Ctrl+C 停止。\n")

    pending_changes: list[tuple[str, str]] = []
    last_event_at: float | None = None

    try:
        while True:
            time.sleep(max(0.2, args.interval))
            current = scan_snapshot(content_root)
            delta = diff_snapshots(snapshot, current)
            if delta:
                snapshot = current
                pending_changes.extend(delta)
                last_event_at = time.monotonic()

            if (
                pending_changes
                and last_event_at is not None
                and (time.monotonic() - last_event_at) >= max(0.2, args.debounce)
            ):
                batch = pending_changes
                pending_changes = []
                last_event_at = None

                requires_full, target_changes = plan_sync_changes(batch, content_root)
                if not requires_full and not target_changes:
                    ignored = ", ".join(sorted({p for _, p in batch}))
                    print(f"🙈 仅非文章文件变更，跳过数据库同步: {ignored}")
                    continue

                if requires_full:
                    print("\n🔁 检测到分类索引变更，执行校验与全量同步...")
                else:
                    summary = ", ".join(f"{s}:{p}" for s, p in target_changes)
                    print(f"\n🔄 检测到内容变更 -> {summary}")

                execute_sync_cycle(
                    repo_root=REPO_ROOT,
                    content_root=content_root,
                    python_exe=python_exe,
                    requires_full=requires_full,
                    changes=target_changes,
                    mode=args.mode,
                    run_contract=not args.no_contract_check,
                    run_mdx=not args.no_mdx_check,
                )
    except KeyboardInterrupt:
        print("\n🛑 已停止内容目录监听。")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
