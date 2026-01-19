import logging
from typing import Any, Dict

import frontmatter
from app.posts.model import Post

logger = logging.getLogger(__name__)


class PostDumper:
    """
    文章序列化器：将 Post 对象转换为 MDX 文件内容 (Frontmatter + Body)
    """

    @staticmethod
    def dump(post: Post, tags: list[str] = None, category_slug: str = None) -> str:
        """
        将 Post 对象转换为 MDX 字符串
        """
        metadata = PostDumper._extract_metadata(post, tags, category_slug)

        # 使用 python-frontmatter 生成文件内容
        # 注意：frontmatter.dumps 默认不会保留空行等格式，但对于生成新文件没问题
        # 如果需要精细控制格式，可能需要手动拼接字符串
        post_obj = frontmatter.Post(post.content_mdx or "", **metadata)
        return frontmatter.dumps(post_obj)

    @staticmethod
    def _extract_metadata(
        post: Post, tags: list[str] = None, category_slug: str = None
    ) -> Dict[str, Any]:
        """提取元数据字典"""
        metadata = {
            "title": post.title,
            "slug": post.slug,
            "date": post.created_at.strftime("%Y-%m-%d %H:%M:%S")
            if post.created_at
            else None,
            "status": post.status.value,
            "author_id": str(post.author_id),
        }

        # 可选字段
        if post.excerpt:
            metadata["excerpt"] = post.excerpt

        if post.cover_media_id:
            metadata["cover_media_id"] = str(post.cover_media_id)

        if category_slug:
            metadata["category"] = category_slug
        elif post.category_id:
            # 如果没传slug但有ID，这里为了生成文件，最好是 Service 层传入 slug
            # 这里仅作为兜底，只存 ID 不太友好，但为了数据完整性先存着
            metadata["category_id"] = str(post.category_id)

        if tags:
            metadata["tags"] = tags

        # 渲染模式配置 (Rendering Mode)
        # 默认值不写入，保持简洁
        if post.enable_jsx:
            metadata["enable_jsx"] = True

        if not post.use_server_rendering:
            # 只有当非默认值(False)时才写入
            metadata["use_server_rendering"] = False

        if post.meta_description:
            metadata["description"] = post.meta_description

        if post.meta_keywords:
            metadata["keywords"] = post.meta_keywords

        # 移除 None 值
        return {k: v for k, v in metadata.items() if v is not None}
