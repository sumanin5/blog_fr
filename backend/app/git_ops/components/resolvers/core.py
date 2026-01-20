import logging
from datetime import datetime
from typing import Optional

from app.git_ops.exceptions import GitOpsSyncError
from app.posts.model import PostStatus, PostType

logger = logging.getLogger(__name__)


class PostTypeResolver:
    """文章类型解析器"""

    async def resolve(
        self, meta_type: Optional[str], derived_type: Optional[str]
    ) -> PostType:
        post_type_value = derived_type or meta_type
        if not post_type_value:
            return PostType.ARTICLE
        post_type_value = post_type_value.lower()
        try:
            return PostType(post_type_value)
        except ValueError:
            available_types = [t.value for t in PostType]
            raise GitOpsSyncError(
                f"Invalid post_type '{post_type_value}'",
                detail=f"Available types: {available_types}",
            )


class StatusResolver:
    """文章状态解析器"""

    async def resolve(self, meta: dict) -> str:
        status = meta.get("status")
        if status:
            status_lower = status.lower()
            valid_statuses = [PostStatus.DRAFT.value, PostStatus.PUBLISHED.value]
            if status_lower in valid_statuses:
                return status_lower
            raise GitOpsSyncError(
                f"Invalid status '{status}'",
                detail=f"Available statuses: {valid_statuses}",
            )
        published = meta.get("published")
        if published is False:
            return PostStatus.DRAFT.value
        if published is True:
            return PostStatus.PUBLISHED.value
        return PostStatus.PUBLISHED.value


class DateResolver:
    """发布日期解析器"""

    async def resolve(self, meta: dict, status: str) -> Optional[datetime]:
        from dateutil import parser as date_parser

        date_val = meta.get("date") or meta.get("published_at")

        if not date_val:
            if status == PostStatus.PUBLISHED.value:
                return datetime.now()
            return None

        if isinstance(date_val, datetime):
            return date_val

        try:
            if isinstance(date_val, str):
                return date_parser.parse(date_val)
            return None
        except (ValueError, TypeError):
            logger.warning(f"Failed to parse date: {date_val}")
            return datetime.now() if status == PostStatus.PUBLISHED.value else None
