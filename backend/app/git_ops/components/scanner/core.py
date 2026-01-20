import asyncio
import json
import logging
from pathlib import Path
from typing import List, Optional

import frontmatter
from app.git_ops.exceptions import GitOpsConfigurationError, ScanError

from .models import ScannedPost
from .path_parser import PathParser
from .utils import calc_hash

logger = logging.getLogger(__name__)


class MDXScanner:
    def __init__(self, content_root: Path, path_parser: Optional[PathParser] = None):
        self.content_root = Path(content_root)
        self.path_parser = path_parser or PathParser()

        if not self.content_root.exists():
            raise GitOpsConfigurationError(
                f"Content root does not exist: {content_root}"
            )

    async def scan_file(self, rel_path: str) -> Optional[ScannedPost]:
        """解析单个文件。异常将被统一包装为 ScanError 以便全局处理。"""

        full_path = self.content_root / rel_path
        if not full_path.is_file():
            return None

        try:
            # 1. 异步读取与解析
            raw_content = await asyncio.to_thread(full_path.read_text, encoding="utf-8")
            post = frontmatter.loads(raw_content)

            # 2. 计算 Hash 与路径解析
            meta_str = json.dumps(post.metadata, sort_keys=True, default=str)
            path_info = self.path_parser.parse(rel_path)

            return ScannedPost(
                file_path=str(rel_path),
                content_hash=calc_hash(raw_content),
                meta_hash=calc_hash(meta_str),
                frontmatter=post.metadata,
                content=post.content,
                updated_at=full_path.stat().st_mtime,
                derived_post_type=path_info.get("post_type"),
                derived_category_slug=path_info.get("category_slug"),
            )
        except Exception as e:
            # 附带文件路径上下文，符合全局错误处理规范
            raise ScanError(rel_path, str(e)) from e

    async def scan_all(
        self, glob_patterns: Optional[List[str]] = None
    ) -> List[ScannedPost]:
        """扫描所有匹配的文件 (并发模式)。"""
        if glob_patterns is None:
            glob_patterns = ["**/*.md", "**/*.mdx"]

        # 收集待扫描路径
        target_paths = []
        for pattern in glob_patterns:
            for path in self.content_root.glob(pattern):
                if path.is_file():
                    target_paths.append(str(path.relative_to(self.content_root)))

        if not target_paths:
            return []

        # 并发扫描
        tasks = [self.scan_file(p) for p in target_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 筛选结果，记录错误但不中断整体流程
        scanned_posts = []
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                logger.error(f"Failed to scan file {target_paths[i]}: {res}")
            elif res:
                scanned_posts.append(res)

        return scanned_posts
