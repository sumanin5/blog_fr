"""纯标准库内容目录快照扫描与增量同步规划器。

同时供后端常驻生命周期监听任务（`app.git_ops.watcher`）与宿主机 CLI 工具（`scripts/watch_content.py`）复用，
避免任何逻辑重复；故意只使用 Python 标准库以便宿主机无虚拟环境时也能直接导入。
"""

from __future__ import annotations

import os
from pathlib import Path, PurePosixPath
import re
from typing import Iterable

CONTENT_EXTENSIONS = {".md", ".mdx"}
DOCUMENTS = {"README", "AGENTS", "CLAUDE", "LICENSE", "CONTRIBUTING", "CHANGELOG"}
IGNORED_DIR_NAMES = {"__pycache__", "node_modules", "tools"}
IGNORED_SUFFIXES = (".tmp", ".swp", ".swo", ".bak")

FENCE_RE = re.compile(r"^\s*(```|~~~)")
ENABLE_JSX_RE = re.compile(r"(?im)^enable_jsx\s*:\s*(true|yes|1)\s*$")
JSX_TAG_RE = re.compile(r"<\s*([A-Z][A-Za-z0-9_]*)\b")
REGISTERED_KEY_RE = re.compile(r"^\s+([A-Z][A-Za-z0-9_]*)\s*:", re.MULTILINE)
FRONTMATTER_BLOCK_RE = re.compile(r"^\ufeff?---[\s\S]*?---\s*")


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
    """判断是否为 articles/ideas 下的有效文章或分类 index.md 路径。"""
    pure = PurePosixPath(rel_posix.replace("\\", "/"))
    if pure.suffix.lower() not in CONTENT_EXTENSIONS:
        return False
    if pure.stem.upper() in DOCUMENTS:
        return False
    if any(part.startswith(".") for part in pure.parts):
        return False
    return len(pure.parts) == 3 and pure.parts[0] in {"articles", "ideas"}


def _is_contract_file(rel_posix: str) -> bool:
    pure = PurePosixPath(rel_posix)
    return (
        pure.suffix.lower() in CONTENT_EXTENSIONS
        and pure.stem.upper() not in DOCUMENTS
        and not any(part.startswith(".") for part in pure.parts)
    )


def scan_snapshot(content_root: Path) -> dict[str, tuple[int, int]]:
    """递归扫描内容目录（剪枝 .git/.agent/.obsidian 等目录），返回 {相对POSIX路径: (mtime_ns, size)}。"""
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


def collect_contract_files(content_root: Path) -> dict[str, str]:
    """收集用于契约校验的内容文本，避开 .git/.agent 等无关大目录遍历。"""
    files: dict[str, str] = {}
    resolved_root = content_root.resolve()
    for rel_path in sorted(scan_snapshot(resolved_root)):
        if not _is_contract_file(rel_path):
            continue
        candidate = (resolved_root / rel_path).resolve()
        if not candidate.is_relative_to(resolved_root):
            raise ValueError(f"{rel_path}: source escapes repository")
        if candidate.is_file():
            files[rel_path] = candidate.read_text(encoding="utf-8")
    return files


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

        # 删除整个专栏目录时触发全量对齐
        if len(pure.parts) == 2 and pure.parts[0] in {"articles", "ideas"}:
            if status == "D":
                return True, []
            continue

        # 顶层或非 articles/ideas 目录下的文档不触发数据库同步
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

        # 专栏内图片或附属资源变动时，刷新同专栏文章以更新媒体引用
        category_dir = content_root / pure.parts[0] / pure.parts[1]
        if category_dir.is_dir():
            for child in sorted(category_dir.iterdir()):
                if child.is_file() and child.suffix.lower() in CONTENT_EXTENSIONS:
                    sibling_rel = f"{pure.parts[0]}/{pure.parts[1]}/{child.name}"
                    if is_article_path(sibling_rel) and sibling_rel not in mapped:
                        mapped[sibling_rel] = "M"

    ordered = sorted((status, path) for path, status in mapped.items())
    return False, ordered


def needs_mdx_check(path: Path) -> bool:
    """判断文件是否需要执行 MDX 编译预检（.mdx 或启用 enable_jsx 的 .md）。"""
    if not path.is_file():
        return False
    if path.suffix.lower() == ".mdx":
        return True
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.lstrip("\ufeff").splitlines()
    if not lines or lines[0].strip() != "---":
        return False
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        return False
    frontmatter = "\n".join(lines[1:end])
    return bool(ENABLE_JSX_RE.search(frontmatter))


def strip_mdx_frontmatter(raw: str) -> str:
    """移除文件头部的 YAML frontmatter。"""
    return FRONTMATTER_BLOCK_RE.sub("", raw, count=1)


def extract_registered_components(registry_path: Path) -> set[str]:
    """从 mdx-components.tsx 解析已注册的大写 JSX 组件标签名。"""
    if not registry_path.is_file():
        return set()
    content = registry_path.read_text(encoding="utf-8")
    marker = "export function createMdxComponents"
    idx = content.find(marker)
    section = content[idx:] if idx >= 0 else content
    return set(REGISTERED_KEY_RE.findall(section))


def find_unregistered_jsx_tags(
    mdx_body: str, registered: set[str]
) -> list[str]:
    """检查围栏代码块与行内代码之外的大写 JSX 组件是否全部已在注册表中声明。"""
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
