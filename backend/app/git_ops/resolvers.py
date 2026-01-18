"""
Git 同步的解析器模块

负责解析 MDX frontmatter 中的基础字段（文章类型、状态、日期等）
"""

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
        """解析文章类型

        优先级：
        1. Frontmatter 中的 type/post_type
        2. 路径推断出的 derived_type
        3. 默认为 ARTICLE

        Args:
            meta_type: frontmatter 中的 type 字段值
            derived_type: 从路径推断出的类型

        Returns:
            PostType 枚举值

        Raises:
            GitOpsSyncError: 如果类型值无效
        """
        post_type_value = meta_type or derived_type

        if not post_type_value:
            return PostType.ARTICLE

        # 标准化类型名称（转为小写）
        post_type_value = post_type_value.lower()

        try:
            # 尝试直接使用枚举值匹配 (例如 "article", "idea")
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
        """解析文章状态

        优先级：
        1. status 字段（直接指定状态）
        2. published 字段（布尔值，向后兼容）
        3. 默认为 PUBLISHED（Git 文件通常是已发布内容）

        Args:
            meta: frontmatter 字典

        Returns:
            PostStatus 值（"DRAFT" 或 "PUBLISHED"）

        Raises:
            GitOpsSyncError: 如果状态值无效
        """
        status = meta.get("status")
        if status:
            # 标准化状态值（转为小写）
            status_lower = status.lower()
            valid_statuses = [PostStatus.DRAFT.value, PostStatus.PUBLISHED.value]
            if status_lower in valid_statuses:
                return status_lower
            raise GitOpsSyncError(
                f"Invalid status '{status}'",
                detail=f"Available statuses: {valid_statuses}",
            )

        # 向后兼容：published 布尔字段
        published = meta.get("published")
        if published is False:
            return PostStatus.DRAFT.value
        if published is True:
            return PostStatus.PUBLISHED.value

        # 默认为已发布（Git 文件通常是已发布内容）
        return PostStatus.PUBLISHED.value


class DateResolver:
    """发布日期解析器"""

    async def resolve(self, meta: dict, status: str) -> Optional[datetime]:
        """解析发布日期

        优先级：
        1. date 字段
        2. published_at 字段
        3. 如果都没有且状态为 PUBLISHED，使用当前时间
        4. 如果状态为 DRAFT，返回 None

        支持的日期格式：
        - ISO 8601: "2024-01-15T10:30:00"
        - 日期字符串: "2024-01-15"
        - datetime 对象（YAML 自动解析）

        Args:
            meta: frontmatter 字典
            status: 文章状态（从 StatusResolver 获取）

        Returns:
            datetime 对象或 None

        Raises:
            GitOpsSyncError: 如果日期格式无效
        """
        date_value = meta.get("date") or meta.get("published_at")

        # 如果已经是 datetime 对象（YAML 解析器可能自动转换）
        if isinstance(date_value, datetime):
            return date_value

        # 如果是字符串，尝试解析
        if isinstance(date_value, str):
            try:
                # 尝试 ISO 格式解析
                return datetime.fromisoformat(date_value.replace("Z", "+00:00"))
            except ValueError:
                try:
                    # 尝试只有日期的格式 (YYYY-MM-DD)
                    return datetime.strptime(date_value, "%Y-%m-%d")
                except ValueError:
                    raise GitOpsSyncError(
                        f"Invalid date format '{date_value}'",
                        detail="Supported formats: ISO 8601 or YYYY-MM-DD",
                    )

        # 如果没有指定日期
        # - 已发布状态：使用当前时间
        # - 草稿状态：返回 None
        if status == PostStatus.PUBLISHED:
            return datetime.now()

        return None
