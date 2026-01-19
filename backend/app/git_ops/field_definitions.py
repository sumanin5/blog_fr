from dataclasses import dataclass
from typing import Any, Callable, List, Optional
from uuid import UUID

from app.posts.model import PostStatus


@dataclass
class FieldDefinition:
    """定义字段在 Frontmatter 和 Model 之间的映射关系"""

    frontmatter_key: str
    model_attr: str
    default: Any = None
    skip_if_default: bool = False
    parse_fn: Optional[Callable[[Any], Any]] = None
    serialize_fn: Optional[Callable[[Any], Any]] = None


# 辅助函数
def parse_uuid(val: Any) -> Optional[UUID]:
    if not val:
        return None
    if isinstance(val, UUID):
        return val
    try:
        return UUID(str(val))
    except (ValueError, TypeError):
        return None


def serialize_uuid(val: Any) -> Optional[str]:
    return str(val) if val else None


def serialize_date(v):
    return v.strftime("%Y-%m-%d %H:%M:%S") if v else v


def serialize_bool_true(v):
    return True if v else None


def serialize_bool_false(v):
    return False if not v else None


# 定义核心映射
FIELD_DEFINITIONS: List[FieldDefinition] = [
    # 基础字段
    FieldDefinition(frontmatter_key="title", model_attr="title"),
    FieldDefinition(frontmatter_key="slug", model_attr="slug"),
    FieldDefinition(
        frontmatter_key="date", model_attr="created_at", serialize_fn=serialize_date
    ),
    FieldDefinition(
        frontmatter_key="status",
        model_attr="status",
        parse_fn=lambda v: v.lower() if v else PostStatus.PUBLISHED.value,
        serialize_fn=lambda v: v.value if hasattr(v, "value") else v,
    ),
    # UUID 引用
    FieldDefinition(
        frontmatter_key="author_id",
        model_attr="author_id",
        parse_fn=parse_uuid,
        serialize_fn=serialize_uuid,
    ),
    FieldDefinition(
        frontmatter_key="cover_media_id",
        model_attr="cover_media_id",
        parse_fn=parse_uuid,
        serialize_fn=serialize_uuid,
    ),
    FieldDefinition(
        frontmatter_key="category_id",
        model_attr="category_id",
        parse_fn=parse_uuid,
        serialize_fn=serialize_uuid,
    ),
    # 布尔开关
    FieldDefinition(
        frontmatter_key="featured",
        model_attr="is_featured",
        default=False,
        skip_if_default=True,
        serialize_fn=serialize_bool_true,
    ),
    FieldDefinition(
        frontmatter_key="allow_comments",
        model_attr="allow_comments",
        default=True,
        skip_if_default=True,
    ),
    FieldDefinition(
        frontmatter_key="enable_jsx",
        model_attr="enable_jsx",
        default=False,
        skip_if_default=True,
        serialize_fn=serialize_bool_true,
    ),
    FieldDefinition(
        frontmatter_key="use_server_rendering",
        model_attr="use_server_rendering",
        default=True,
        skip_if_default=True,
        serialize_fn=serialize_bool_false,
    ),
    # SEO
    FieldDefinition(frontmatter_key="meta_title", model_attr="meta_title"),
    FieldDefinition(frontmatter_key="meta_description", model_attr="meta_description"),
    FieldDefinition(frontmatter_key="meta_keywords", model_attr="meta_keywords"),
    FieldDefinition(
        frontmatter_key="excerpt", model_attr="excerpt", skip_if_default=True
    ),
]

# 方便查询的索引
FIELD_BY_ATTR = {f.model_attr: f for f in FIELD_DEFINITIONS}
FIELD_BY_KEY = {f.frontmatter_key: f for f in FIELD_DEFINITIONS}
