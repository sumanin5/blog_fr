import hashlib
from pathlib import PurePosixPath
from typing import Union

CONTENT_EXTENSIONS = (".md", ".mdx")

# 内容仓库的说明文档（任意层级），不作为文章同步
IGNORED_DOC_STEMS = {
    "README",
    "AGENTS",
    "CLAUDE",
    "LICENSE",
    "CONTRIBUTING",
    "CHANGELOG",
}


def calc_hash(content: Union[str, bytes]) -> str:
    """计算内容的 SHA256"""
    if isinstance(content, str):
        content = content.encode("utf-8")
    return hashlib.sha256(content).hexdigest()


def is_ignored_path(rel_path: Union[str, PurePosixPath]) -> bool:
    """说明文档或隐藏路径（任意一级以 . 开头）不参与同步"""
    path = PurePosixPath(rel_path)
    return path.stem.upper() in IGNORED_DOC_STEMS or any(
        part.startswith(".") for part in path.parts
    )


def is_content_file(rel_path: Union[str, PurePosixPath]) -> bool:
    """判断相对路径是否为需要同步的文章文件（全量与增量同步共用）"""
    return PurePosixPath(rel_path).suffix.lower() in CONTENT_EXTENSIONS and not (
        is_ignored_path(rel_path)
    )
