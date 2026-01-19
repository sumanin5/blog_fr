from typing import Any, Callable, Dict, List, Optional, Tuple
from uuid import UUID

from app.posts.model import Post


def _normalize_uuid(value: Any) -> Any:
    """将 UUID 对象转换为字符串以便对比"""
    if value is None:
        return None
    if isinstance(value, UUID):
        return str(value)
    return value


def _normalize_status(value: Any) -> Any:
    """规范化状态值"""
    if value is None:
        return None
    # 如果是 Enum，获取其值
    if hasattr(value, "value"):
        return value.value
    return value


class PostComparator:
    """Post 对象对比器

    支持灵活的字段对比，可以轻松扩展以支持更多字段。
    """

    # 定义要对比的字段映射
    # 格式: "display_name": (post_field, data_field, normalize_fn)
    # normalize_fn 用于在对比前规范化值（如 UUID 转字符串）
    COMPARABLE_FIELDS: Dict[str, Tuple[str, str, Optional[Callable]]] = {
        # 内容字段
        "title": ("title", "title", None),
        "content": ("content_mdx", "content_mdx", None),
        "excerpt": ("excerpt", "excerpt", None),
        # 分类和标签
        "category": ("category_id", "category_id", _normalize_uuid),
        # SEO 字段
        "meta_title": ("meta_title", "meta_title", None),
        "meta_description": ("meta_description", "meta_description", None),
        "meta_keywords": ("meta_keywords", "meta_keywords", None),
        # 功能开关
        "featured": ("is_featured", "is_featured", None),
        "allow_comments": ("allow_comments", "allow_comments", None),
        "enable_jsx": ("enable_jsx", "enable_jsx", None),
        "use_server_rendering": ("use_server_rendering", "use_server_rendering", None),
        # 状态字段
        "status": ("status", "status", _normalize_status),
        "published_at": ("published_at", "published_at", None),
    }

    @staticmethod
    def compare(post: Post, new_data: Dict[str, Any]) -> List[str]:
        """对比 Post 和新数据，返回变更的字段列表

        Args:
            post: 数据库中的 Post 对象
            new_data: 从 frontmatter 解析的新数据字典

        Returns:
            变更的字段名称列表
        """
        changes = []

        for change_name, field_config in PostComparator.COMPARABLE_FIELDS.items():
            post_field, data_field, normalize_fn = field_config

            # 获取旧值和新值
            old_value = getattr(post, post_field, None)
            new_value = new_data.get(data_field)

            # 应用规范化函数
            if normalize_fn:
                old_value = normalize_fn(old_value)
                new_value = normalize_fn(new_value)

            # 对比
            if old_value != new_value:
                changes.append(change_name)

        return changes

    @staticmethod
    def add_comparable_field(
        display_name: str,
        post_field: str,
        data_field: str,
        normalize_fn: Optional[Callable] = None,
    ) -> None:
        """动态添加可对比的字段

        这允许在运行时扩展对比逻辑，而无需修改类定义。

        Args:
            display_name: 在变更列表中显示的字段名称
            post_field: Post 对象中的属性名称
            data_field: new_data 字典中的键名称
            normalize_fn: 可选的规范化函数
        """
        PostComparator.COMPARABLE_FIELDS[display_name] = (
            post_field,
            data_field,
            normalize_fn,
        )
