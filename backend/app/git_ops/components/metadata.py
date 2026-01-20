"""
MDX Frontmatter 映射逻辑

通过 Single Source of Truth (SSOT) 模式，统一处理从 MDX 读取和写入 MDX 的字段映射。
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


class Frontmatter(BaseModel):
    """
    MDX Frontmatter 数据模型

    负责 Post 数据库对象与 MDX YAML 元数据之间的双向转换。
    """

    title: str = ""
    slug: Optional[str] = None
    published_at: Optional[datetime] = Field(None, alias="date")
    status: Optional[str] = None
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
    excerpt: Optional[str] = None
    tags: Optional[List[str]] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        extra="allow",
    )

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v: Any) -> Optional[List[str]]:
        """将 YAML 中的逗号分隔字符串解析为列表"""
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()]
        return v

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
        """将 Post 对象转换为适合写入 MDX 的字典"""
        obj = cls.model_validate(post)
        if tags is not None:
            obj.tags = tags
        return obj.model_dump(by_alias=True, exclude_none=True)
