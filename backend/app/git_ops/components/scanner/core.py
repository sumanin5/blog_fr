import asyncio
import json
import logging
from pathlib import Path
from typing import List, Optional

import frontmatter
from app.git_ops.exceptions import ScanError

from .models import ScannedPost
from .path_parser import PathParser
from .utils import calc_hash

logger = logging.getLogger(__name__)


class MDXScanner:
    def __init__(self, content_root: Path, path_parser: Optional[PathParser] = None):
        self.content_root = content_root
        self.path_parser = path_parser or PathParser()
        if not content_root.exists():
            logger.warning(f"Content root does not exist: {content_root}")

    async def scan_file(self, rel_path: str) -> Optional[ScannedPost]:
        """解析单个文件"""

        full_path = self.content_root / rel_path
        if not full_path.exists():
            return None

        try:
            # 1. 原始文件读取 (ThreadPool execution)
            raw_content = await asyncio.to_thread(full_path.read_text, encoding="utf-8")

            # 2. 解析 Frontmatter
            post = frontmatter.loads(raw_content)

            # 3. 计算 Hash
            content_hash = calc_hash(raw_content)

            # Meta hash (sorted json string)
            meta_str = json.dumps(post.metadata, sort_keys=True, default=str)
            meta_hash = calc_hash(meta_str)

            # 4. 路径解析
            path_info = self.path_parser.parse(rel_path)

            return ScannedPost(
                file_path=str(rel_path),
                content_hash=content_hash,
                meta_hash=meta_hash,
                frontmatter=post.metadata,
                content=post.content,
                updated_at=full_path.stat().st_mtime,
                derived_post_type=path_info["post_type"],
                derived_category_slug=path_info["category_slug"],
            )
        except Exception as e:
            logger.error(f"Error scanning {rel_path}: {e}")
            raise ScanError(rel_path, str(e))

    async def scan_all(self, glob_patterns: List[str] = None) -> List[ScannedPost]:
        """扫描所有匹配的文件

        Args:
            glob_patterns: 默认为 ["**/*.md", "**/*.mdx"]
        """
        if glob_patterns is None:
            glob_patterns = ["**/*.md", "**/*.mdx"]

        results = []
        for pattern in glob_patterns:
            for path in self.content_root.glob(pattern):
                if path.is_file():
                    rel_path = path.relative_to(self.content_root)
                    scanned = await self.scan_file(str(rel_path))
                    if scanned:
                        results.append(scanned)
        return results
