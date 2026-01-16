"""
辅助函数

提供 slug 生成、标签同步等辅助功能
"""

import random
import string
from typing import List

from app.posts.model import Post, PostTagLink
from slugify import slugify as python_slugify
from sqlalchemy import delete
from sqlmodel.ext.asyncio.session import AsyncSession


def generate_slug_with_random_suffix(title: str, random_length: int = 6) -> str:
    """生成带随机后缀的 slug

    Args:
        title: 标题
        random_length: 随机后缀长度

    Returns:
        带随机后缀的 slug
    """
    base_slug = python_slugify(title)
    if not base_slug:
        base_slug = "post"
    random_suffix = "".join(
        random.choices(string.ascii_lowercase + string.digits, k=random_length)
    )
    return f"{base_slug}-{random_suffix}"


async def sync_post_tags(
    session: AsyncSession, post: Post, tag_names: List[str]
) -> None:
    """同步文章标签

    Args:
        session: 数据库会话
        post: 文章对象
        tag_names: 标签名称列表
    """
    from app.posts import crud

    if post.id is None:
        raise ValueError("Post must be persisted (have an ID) before syncing tags")

    # 使用字典去重，保持顺序（Python 3.7+）
    unique_tags = {}
    for name in tag_names:
        # 清理并限制标签名长度（数据库限制50字符）
        name = name.strip()
        if not name:
            continue

        # 如果超过50字符，截断并添加省略号
        if len(name) > 50:
            name = name[:47] + "..."

        # 生成slug并确保不超过50字符
        tag_slug = python_slugify(name)
        if len(tag_slug) > 50:
            tag_slug = tag_slug[:50]

        # 使用标签名作为key去重（忽略大小写）
        unique_tags[name.lower()] = (name, tag_slug)

    # 获取或创建标签
    tag_ids = []
    for name, slug in unique_tags.values():
        tag = await crud.get_or_create_tag(session, name, slug)
        tag_ids.append(tag.id)

    # 删除旧的关联
    stmt = delete(PostTagLink).where(PostTagLink.post_id == post.id)
    await session.exec(stmt)

    # 创建新的关联
    for tag_id in tag_ids:
        link = PostTagLink(post_id=post.id, tag_id=tag_id)
        session.add(link)
