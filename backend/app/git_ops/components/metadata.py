"""
MDX Frontmatter 映射逻辑

通过 Single Source of Truth (SSOT) 模式，统一处理从 MDX 读取和写入 MDX 的字段映射。
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
    model_validator,
)


class Frontmatter(BaseModel):
    """
    MDX Frontmatter 数据模型

    负责 Post 数据库对象与 MDX YAML 元数据之间的双向转换。
    """

    title: str = ""
    slug: Optional[str] = None
    published_at: Optional[datetime] = Field(None, alias="date")
    status: Optional[str] = None
    post_type: Optional[str] = None
    author_id: Optional[UUID] = None
    cover_media_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    is_featured: bool = Field(False)
    allow_comments: bool = Field(True)
    enable_jsx: bool = Field(False)
    use_server_rendering: bool = Field(True)
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    excerpt: Optional[str] = Field(None, alias="summary")
    tags: Optional[List[str]] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        extra="allow",
    )

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v: Any) -> Optional[List[str]]:
        """将 YAML 中的逗号分隔字符串或 Tag 对象解析为列表"""
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()]
        # 处理 Tag 对象列表（从数据库加载时）
        if isinstance(v, list):
            result = []
            for item in v:
                if hasattr(item, "name"):  # Tag 对象
                    result.append(item.name)
                elif isinstance(item, str):
                    result.append(item)
            return result if result else None
        return v

    @field_validator("post_type", mode="before")
    @classmethod
    def normalize_post_type(cls, v: Any) -> Optional[str]:
        """转换 post_type 为小写"""
        if v is None:
            return None
        return str(v).lower()

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> Optional[str]:
        """验证 status 值"""
        from app.posts.model import PostStatus

        if v is None:
            return None

        # 如果是 enum，转换为字符串
        if isinstance(v, PostStatus):
            return v.value

        # 转换为小写并验证
        status_str = str(v).lower()
        valid = [PostStatus.DRAFT.value, PostStatus.PUBLISHED.value]
        if status_str not in valid:
            raise ValueError(f"Invalid status. Must be one of: {valid}")
        return status_str

    @model_validator(mode="before")
    @classmethod
    def map_description_fields(cls, data: Any) -> Any:
        """处理 description 字段的映射逻辑"""
        if isinstance(data, dict):
            # 1. description -> excerpt (summary) fallback
            # 如果 summary (excerpt 的 alias) 不存在，尝试使用 description
            if not data.get("summary") and data.get("description"):
                data["summary"] = data["description"]

            # 2. description -> meta_description fallback
            # 如果 meta_description 不存在，尝试使用 description
            if not data.get("meta_description") and data.get("description"):
                data["meta_description"] = data["description"]
        return data

    # --- 序列化器 (用于写入 MDX) ---

    @field_serializer("published_at")
    def serialize_date(self, v: Optional[datetime]) -> Optional[str]:
        return v.strftime("%Y-%m-%d %H:%M:%S") if v else None

    @field_serializer("author_id", "cover_media_id", "category_id")
    def serialize_uuid(self, v: Optional[UUID]) -> Optional[str]:
        return str(v) if v else None

    @field_serializer("status")
    def serialize_status(self, v: Any) -> Optional[str]:
        if v is None:
            return None
        return v.value if hasattr(v, "value") else str(v)

    @classmethod
    def to_dict(cls, post: Any, tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """将 Post 对象转换为适合写入 MDX 的字典

        注意：post_type 从路径推断，不写入 frontmatter（Git-First 原则）
        """
        obj = cls.model_validate(post)
        if tags is not None:
            obj.tags = tags
        # 排除 post_type（从路径推断）和 None 值
        return obj.model_dump(by_alias=True, exclude_none=True, exclude={"post_type"})
