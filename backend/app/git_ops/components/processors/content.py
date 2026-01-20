from pathlib import Path
from typing import Any, Dict

from app.git_ops.components.scanner import ScannedPost
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import FieldProcessor


class ContentProcessor(FieldProcessor):
    """处理 content_mdx 和 title fallback"""

    async def process(
        self,
        result: Dict[str, Any],
        meta: Dict[str, Any],
        scanned: ScannedPost,
        session: AsyncSession,
        dry_run: bool = False,
    ) -> None:
        # 设置内容
        result["content_mdx"] = scanned.content

        # Title fallback：如果没有 title，使用文件名
        if not result.get("title"):
            result["title"] = Path(scanned.file_path).stem
