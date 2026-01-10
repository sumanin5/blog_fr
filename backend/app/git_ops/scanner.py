import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import frontmatter
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ScannedPost(BaseModel):
    """文件扫描结果模型"""

    file_path: str = Field(description="相对路径")
    content_hash: str = Field(description="全文Hash (用于变更检测)")
    meta_hash: str = Field(description="Frontmatter Hash")
    frontmatter: Dict[str, Any] = Field(default_factory=dict)
    content: str = Field(description="正文内容")
    updated_at: float = Field(description="文件系统修改时间戳")


class MDXScanner:
    def __init__(self, content_root: Path):
        self.content_root = content_root
        if not content_root.exists():
            logger.warning(f"Content root does not exist: {content_root}")

    def _calc_hash(self, content: str | bytes) -> str:
        """计算 SHA256"""
        if isinstance(content, str):
            content = content.encode("utf-8")
        return hashlib.sha256(content).hexdigest()

    async def scan_file(self, rel_path: str) -> Optional[ScannedPost]:
        """解析单个文件"""
        full_path = self.content_root / rel_path
        if not full_path.exists():
            return None

        try:
            # 1. 原始文件读取
            # 将读取操作放入线程池以避免阻塞事件循环 (虽然对于小文件影响不大，但为了高性能)
            # 对于 Python 3.9+ asyncio.to_thread 是简洁写法
            import asyncio

            raw_content = await asyncio.to_thread(full_path.read_text, encoding="utf-8")

            # 2. 解析 Frontmatter
            # frontmatter.loads 从字符串加载
            post = frontmatter.loads(raw_content)

            # 3. 计算 Hash
            # - content_hash: 整个文件的指纹 (raw_content)
            # - meta_hash: 仅 frontmatter 的指纹 (用于判断是否只改了元数据)
            content_hash = self._calc_hash(raw_content)

            # 简单的 meta hash 计算方式：将 dict 转为排序后的 string
            import json

            meta_str = json.dumps(post.metadata, sort_keys=True, default=str)
            meta_hash = self._calc_hash(meta_str)

            return ScannedPost(
                file_path=str(rel_path),
                content_hash=content_hash,
                meta_hash=meta_hash,
                frontmatter=post.metadata,
                content=post.content,
                updated_at=full_path.stat().st_mtime,
            )
        except Exception as e:
            logger.error(f"Error scanning {rel_path}: {e}")
            return None

    async def scan_all(self, glob_patterns: List[str] = None) -> List[ScannedPost]:
        """扫描所有匹配的文件

        Args:
            glob_patterns: 默认为 ["**/*.md", "**/*.mdx"]
        """
        if glob_patterns is None:
            glob_patterns = ["**/*.md", "**/*.mdx"]

        results = []
        for pattern in glob_patterns:
            # glob 生成器是同步的，如果文件非常多可能也会阻塞
            # 但通常文件系统遍历速度还行
            for path in self.content_root.glob(pattern):
                if path.is_file():
                    rel_path = path.relative_to(self.content_root)
                    scanned = await self.scan_file(str(rel_path))
                    if scanned:
                        results.append(scanned)
        return results
