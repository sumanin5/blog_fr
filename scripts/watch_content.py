#!/usr/bin/env python3
"""
本地内容目录原生事件推送工具（方案 1：零轮询、事件驱动）。

原理：
- 在 Windows / macOS / Linux 宿主机直接通过 Node `fs.watch(..., { recursive: true })`
  调用操作系统原生内核文件通知（Windows 下为 `ReadDirectoryChangesW`），平时完全阻塞休眠（0% 轮询 CPU）。
- 文件保存防抖后，通过 HTTP `POST /api/v1/ops/git/local-changes` 将具体变动文件列表直接推送给本地后端：
  后端按需完成 `content_contract` 契约校验 + 前端 dev `/api/mdx-precheck` 编译预检 + 定向增量入库，
  并自动刷新 Next.js 缓存。

用法：
    python scripts/watch_content.py
    python scripts/watch_content.py --content-dir D:/project/python/blog/blog-content
    python scripts/watch_content.py --once
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys
import threading
import time
from typing import Callable, Iterable
import urllib.error
import urllib.request

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = REPO_ROOT / "frontend"
BACKEND_DIR = REPO_ROOT / "backend"
REGISTRY_PATH = (
    FRONTEND_DIR / "src" / "components" / "public" / "mdx" / "registry" / "mdx-components.tsx"
)
WATCH_PLANNER_PATH = BACKEND_DIR / "app" / "git_ops" / "watch_planner.py"

DEFAULT_REVALIDATE_SECRET = "changethis-please-use-openssl-rand-hex-32"

NODE_WATCH_SCRIPT = """
import fs from "node:fs";

const root = process.argv[1];
const watcher = fs.watch(root, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  process.stdout.write(
    JSON.stringify({ eventType, filename: String(filename) }) + "\\n"
  );
});

watcher.on("error", (err) => {
  console.error(err?.message || String(err));
  process.exit(1);
});

process.stdin.resume();
"""


def _load_watch_planner():
    spec = importlib.util.spec_from_file_location(
        "watch_planner", WATCH_PLANNER_PATH
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_planner = _load_watch_planner()
CONTENT_EXTENSIONS = _planner.CONTENT_EXTENSIONS
DOCUMENTS = _planner.DOCUMENTS
IGNORED_DIR_NAMES = _planner.IGNORED_DIR_NAMES
IGNORED_SUFFIXES = _planner.IGNORED_SUFFIXES
is_ignored_watch_path = _planner.is_ignored_watch_path
is_article_path = _planner.is_article_path
scan_snapshot = _planner.scan_snapshot
diff_snapshots = _planner.diff_snapshots
plan_sync_changes = _planner.plan_sync_changes
_needs_mdx_check = _planner.needs_mdx_check
find_unregistered_jsx_tags = _planner.find_unregistered_jsx_tags


def extract_registered_components(registry_path: Path = REGISTRY_PATH) -> set[str]:
    """从 mdx-components.tsx 解析已注册的大写 JSX 组件标签名。"""
    return _planner.extract_registered_components(registry_path)


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


def resolve_backend_url(
    repo_root: Path = REPO_ROOT, explicit_url: str | None = None
) -> str:
    """解析本地后端基址，默认 http://localhost:8000。"""
    raw = (
        explicit_url
        or os.environ.get("BACKEND_URL")
        or read_env_value(repo_root / ".env", "BACKEND_URL")
        or read_env_value(repo_root / "backend" / ".env", "BASE_URL")
        or "http://localhost:8000"
    )
    return raw.rstrip("/")


def resolve_revalidate_secret(repo_root: Path = REPO_ROOT) -> str:
    """解析内部事件校验密钥（绝不在日志中输出）。"""
    return (
        os.environ.get("REVALIDATE_SECRET")
        or read_env_value(repo_root / ".env", "REVALIDATE_SECRET")
        or read_env_value(repo_root / "backend" / ".env", "REVALIDATE_SECRET")
        or DEFAULT_REVALIDATE_SECRET
    )


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


def resolve_node_executable() -> str:
    """定位宿主机 Node.js 可执行文件，驱动 OS 原生 fs.watch。"""
    found = shutil.which("node")
    if found:
        return found
    win_default = Path("C:/Program Files/nodejs/node.exe")
    if win_default.is_file():
        return str(win_default)
    return "node"


def resolve_fs_event(
    content_root: Path,
    raw_filename: str,
    event_type: str = "change",
) -> list[tuple[str, str]]:
    """将 OS 推送的单个原始文件通知转换为标准 [('A'|'M'|'D', rel_posix)] 变更项。"""
    normalized = raw_filename.replace("\\", "/").strip("/")
    if not normalized:
        return []

    pure = PurePosixPath(normalized)
    if pure.is_absolute() or ".." in pure.parts:
        return []

    rel_posix = pure.as_posix()
    if is_ignored_watch_path(rel_posix):
        return []

    resolved_root = content_root.resolve()
    target = (resolved_root / rel_posix).resolve()
    if not target.is_relative_to(resolved_root):
        return []

    if target.is_file():
        return [("M", rel_posix)]

    if target.is_dir():
        # Windows 写子文件时会附带推送父目录的 "change" 事件，直接忽略防抖误触发
        if event_type != "rename":
            return []
        collected: list[tuple[str, str]] = []
        for sub_rel in sorted(scan_snapshot(target)):
            full_rel = f"{rel_posix}/{sub_rel}"
            if not is_ignored_watch_path(full_rel):
                status = "A" if PurePosixPath(full_rel).name == "index.md" else "M"
                collected.append((status, full_rel))
        return collected

    if len(pure.parts) < 2:
        return []
    return [("D", rel_posix)]


class DebouncedEventBatcher:
    """基于 threading.Timer 的纯事件防抖收集器（零轮询）。"""

    def __init__(
        self,
        debounce_seconds: float,
        on_flush: Callable[[list[tuple[str, str]]], None],
    ) -> None:
        self._debounce = max(0.1, debounce_seconds)
        self._on_flush = on_flush
        self._lock = threading.Lock()
        self._pending: dict[str, str] = {}
        self._timer: threading.Timer | None = None
        self._closed = False

    def add_events(self, events: Iterable[tuple[str, str]]) -> None:
        items = list(events)
        if not items:
            return
        with self._lock:
            if self._closed:
                return
            for status, rel_path in items:
                self._pending[rel_path] = status
            if self._timer is not None:
                self._timer.cancel()
            timer = threading.Timer(self._debounce, self._flush)
            timer.daemon = True
            self._timer = timer
            timer.start()

    def _flush(self) -> None:
        with self._lock:
            self._timer = None
            if not self._pending:
                return
            batch = [(status, rel_path) for rel_path, status in self._pending.items()]
            self._pending.clear()
        self._on_flush(batch)

    def close(self) -> None:
        with self._lock:
            self._closed = True
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None
            self._pending.clear()


def push_changes_to_backend(
    *,
    backend_url: str,
    secret: str,
    changes: list[tuple[str, str]],
    requires_full: bool = False,
    timeout: float = 30.0,
) -> tuple[bool, int, dict]:
    """将文件变动事件通过 HTTP 推送至后端 `/api/v1/ops/git/local-changes`。"""
    url = f"{backend_url.rstrip('/')}/api/v1/ops/git/local-changes"
    body = json.dumps(
        {
            "changes": [{"status": s, "path": p} for s, p in changes],
            "requires_full": requires_full,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            data = json.loads(raw) if raw else {}
            return True, resp.status, data
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="ignore")
        try:
            data = json.loads(raw) if raw else {}
        except ValueError:
            data = {"message": raw or str(exc)}
        return False, exc.code, data


def run_contract_check(
    content_root: Path, python_exe: str, repo_root: Path = REPO_ROOT
) -> tuple[bool, str]:
    """CLI 降级路径：执行 content_contract.py 契约校验。"""
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
    """CLI 降级路径：调用前端 next-mdx-remote/rsc 对修改过的 MDX 做本地编译预检。"""
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
        body = _planner.strip_mdx_frontmatter(raw)
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
        [resolve_node_executable(), "--input-type=module", "-e", node_script],
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
    """构造 CLI 模式下的同步子进程命令、环境变量与工作目录。"""
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
    """CLI 降级路径：契约校验 -> MDX 编译预检 -> 数据库同步。"""
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


def dispatch_push_or_cli(
    *,
    repo_root: Path,
    content_root: Path,
    python_exe: str,
    backend_url: str,
    secret: str,
    changes: list[tuple[str, str]],
    requires_full: bool,
    mode: str = "auto",
    run_contract: bool = True,
    run_mdx: bool = True,
) -> bool:
    """优先使用 HTTP 事件推送接口，在指定 CLI 模式或接口不可用时平滑回退。"""
    if mode in {"auto", "http"}:
        try:
            ok, status_code, data = push_changes_to_backend(
                backend_url=backend_url,
                secret=secret,
                changes=changes,
                requires_full=requires_full,
            )
        except urllib.error.URLError as exc:
            if mode == "http":
                print(f"❌ 无法连接后端事件接口 {backend_url}: {exc}", flush=True)
                return False
            print(f"⚠️ 后端 HTTP 事件接口暂不可达，回退 CLI 同步: {exc}", flush=True)
        else:
            if ok:
                status = data.get("status")
                if status == "skipped":
                    print("🙈 仅非文章文件变更，后端已跳过数据库同步。", flush=True)
                    return True
                stats = data.get("stats") or {}
                print(
                    f"✅ 事件推送同步完成: +{len(stats.get('added', []))} "
                    f"~{len(stats.get('updated', []))} -{len(stats.get('deleted', []))} "
                    f"({float(stats.get('duration', 0.0)):.2f}s)",
                    flush=True,
                )
                return True

            if status_code == 422:
                errors = data.get("errors") or []
                detail = "\n".join(f"  - {e}" for e in errors) or data.get("message", "")
                print(
                    f"❌ 后端预检未通过（{data.get('stage', 'unknown')}），已跳过入库（修好保存会自动重试）：\n{detail}",
                    flush=True,
                )
                return False

            if mode == "http" or status_code not in {404}:
                print(
                    f"❌ 后端事件接口返回 HTTP {status_code}: {data.get('detail') or data.get('message')}",
                    flush=True,
                )
                return False

            print("⚠️ 后端未开启 `/ops/git/local-changes`，回退 CLI 同步。", flush=True)

    requires_cli_full, target_changes = (
        (True, []) if requires_full else plan_sync_changes(changes, content_root)
    )
    if not requires_cli_full and not target_changes:
        print("🙈 仅非文章文件变更，跳过数据库同步。", flush=True)
        return True

    return execute_sync_cycle(
        repo_root=repo_root,
        content_root=content_root,
        python_exe=python_exe,
        requires_full=requires_cli_full,
        changes=target_changes,
        mode="auto" if mode in {"auto", "http"} else mode,
        run_contract=run_contract,
        run_mdx=run_mdx,
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="本地内容目录 OS 原生事件监听与零轮询推送工具（方案 1）"
    )
    parser.add_argument("--content-dir", help="显式指定内容仓库目录，默认读取 .env 中的 CONTENT_HOST_DIR")
    parser.add_argument("--backend-url", help="后端地址，默认读取 .env 或 http://localhost:8000")
    parser.add_argument("--debounce", type=float, default=1.2, help="防抖等待秒数（默认 1.2s）")
    parser.add_argument(
        "--mode",
        choices=("auto", "http", "docker", "local"),
        default="auto",
        help="同步投递模式（默认 auto：优先通过 HTTP 事件推送给运行中的后端）",
    )
    parser.add_argument("--no-contract-check", action="store_true", help="CLI 模式下跳过 content_contract.py")
    parser.add_argument("--no-mdx-check", action="store_true", help="CLI 模式下跳过 MDX 编译与标签检查")
    parser.add_argument("--once", action="store_true", help="仅执行一次校验与全量同步后退出")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    content_root = resolve_content_dir(REPO_ROOT, args.content_dir)
    backend_url = resolve_backend_url(REPO_ROOT, args.backend_url)
    secret = resolve_revalidate_secret(REPO_ROOT)
    python_exe = resolve_python_executable(REPO_ROOT)

    if not content_root.is_dir():
        print(f"❌ 内容目录不存在: {content_root}", file=sys.stderr)
        return 1

    print(f"👀 正在通过 OS 原生事件监听内容目录（零轮询）: {content_root}")
    print(
        f"⚙️  投递模式: {args.mode} | 后端地址: {backend_url} | 防抖: {args.debounce:.1f}s"
    )

    if args.once:
        ok = dispatch_push_or_cli(
            repo_root=REPO_ROOT,
            content_root=content_root,
            python_exe=python_exe,
            backend_url=backend_url,
            secret=secret,
            changes=[],
            requires_full=True,
            mode=args.mode,
            run_contract=not args.no_contract_check,
            run_mdx=not args.no_mdx_check,
        )
        return 0 if ok else 1

    node_exe = resolve_node_executable()
    proc = subprocess.Popen(
        [node_exe, "--input-type=module", "-e", NODE_WATCH_SCRIPT, str(content_root)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        stdin=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )

    sync_lock = threading.Lock()

    def _on_flush(batch: list[tuple[str, str]]) -> None:
        summary = ", ".join(f"{s}:{p}" for s, p in batch)
        print(f"\n⚡ 捕获内核文件变动事件 -> {summary}", flush=True)
        with sync_lock:
            dispatch_push_or_cli(
                repo_root=REPO_ROOT,
                content_root=content_root,
                python_exe=python_exe,
                backend_url=backend_url,
                secret=secret,
                changes=batch,
                requires_full=False,
                mode=args.mode,
                run_contract=not args.no_contract_check,
                run_mdx=not args.no_mdx_check,
            )

    batcher = DebouncedEventBatcher(args.debounce, _on_flush)
    print(
        "✅ OS 事件监听已就绪（空闲时 0% 轮询），保存文章或图片后将自动推送入库。按 Ctrl+C 停止。\n",
        flush=True,
    )

    try:
        assert proc.stdout is not None
        for raw_line in proc.stdout:
            line = raw_line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                continue
            filename = payload.get("filename")
            event_type = payload.get("eventType", "change")
            if not isinstance(filename, str):
                continue
            events = resolve_fs_event(content_root, filename, str(event_type))
            batcher.add_events(events)

        rc = proc.wait()
        if rc != 0:
            err = proc.stderr.read().strip() if proc.stderr else ""
            print(f"❌ OS 文件监听进程异常退出 ({rc}): {err}", file=sys.stderr)
            return rc
        return 0
    except KeyboardInterrupt:
        print("\n🛑 已停止 OS 原生内容目录监听。")
        return 0
    finally:
        batcher.close()
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
        time.sleep(0.05)


if __name__ == "__main__":
    raise SystemExit(main())
