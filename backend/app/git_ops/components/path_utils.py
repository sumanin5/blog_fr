"""内容仓库路径的规范化工具。"""

import os
from pathlib import Path


def normalize_source_path(source_path: str, content_dir: Path) -> str:
    """将数据库中的 source_path 规范为内容仓库内的 POSIX 相对路径。

    历史版本可能把绝对路径写进数据库；只要路径仍位于当前内容仓库内，
    就转换为相对路径。仓库外的绝对路径保持原样，交由调用方拒绝。
    """
    raw = str(source_path).replace("\\", "/")
    candidate = Path(raw)
    if not candidate.is_absolute():
        return raw

    try:
        return candidate.resolve().relative_to(Path(content_dir).resolve()).as_posix()
    except ValueError:
        return raw


def is_same_path(left: str, right: str) -> bool:
    """按当前文件系统规则比较两个路径（Windows 下忽略大小写）。"""
    return os.path.normcase(left.replace("\\", "/")) == os.path.normcase(
        right.replace("\\", "/")
    )


def is_source_path_within_repository(source_path: str, content_dir: Path) -> bool:
    """判断数据库 source_path 是否仍位于内容仓库内。

    历史绝对路径可能因仓库搬迁而指向外部；这类记录不能被全量同步当作
    普通孤儿删除，必须先由人工确认。
    """
    raw = str(source_path).replace("\\", "/")
    if not raw:
        return False
    candidate = Path(raw)
    try:
        resolved = (
            candidate.resolve()
            if candidate.is_absolute()
            else (Path(content_dir) / raw).resolve()
        )
        resolved.relative_to(Path(content_dir).resolve())
    except (OSError, ValueError):
        return False
    return True
