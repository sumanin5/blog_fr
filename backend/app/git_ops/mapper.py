"""
Git 同步的映射器模块

负责将 MDX frontmatter 映射为 Post 模型字段
"""

from pathlib import Path
from typing import Any, Dict

from app.git_ops.exceptions import GitOpsSyncError
from app.git_ops.resolvers import AuthorResolver, CoverResolver
from app.git_ops.scanner import ScannedPost
from sqlalchemy.ext.asyncio import AsyncSession


class FrontmatterMapper:
    """Frontmatter 映射器"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.author_resolver = AuthorResolver(session)
        self.cover_resolver = CoverResolver(session)

    async def map_to_post(self, scanned: ScannedPost) -> Dict[str, Any]:
        """将 Frontmatter 转换为 Post 模型字段

        Args:
            scanned: 扫描到的文章数据

        Returns:
            Post 模型字段的字典

        Raises:
            GitOpsSyncError: 如果必填字段缺失或无效
        """
        meta = scanned.frontmatter

        # 解析作者（必填）
        author_value = meta.get("author")
        if not author_value:
            raise GitOpsSyncError(
                f"Missing required field 'author' in {scanned.file_path}",
                detail="Every post must specify an author in frontmatter",
            )

        # 查询作者（如果不存在会抛出 GitOpsSyncError）
        author_id = await self.author_resolver.resolve(author_value)

        # 解析封面图
        cover_path = meta.get("cover") or meta.get("image")
        cover_media_id = None
        if cover_path:
            cover_media_id = await self.cover_resolver.resolve(cover_path)

        return {
            "title": meta.get("title", Path(scanned.file_path).stem),
            "slug": meta.get("slug"),
            "excerpt": meta.get("summary") or meta.get("excerpt") or "",
            "content_mdx": scanned.content,
            "is_published": meta.get("published", True),
            "cover_media_id": cover_media_id,
            "author_id": author_id,
            # Tags and Categories can be added here
        }
