from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ScannedPost(BaseModel):
    """文件扫描结果模型"""

    file_path: str = Field(description="相对路径")
    content_hash: str = Field(description="全文Hash (用于变更检测)")
    meta_hash: str = Field(description="Frontmatter Hash")
    frontmatter: Dict[str, Any] = Field(default_factory=dict)
    content: str = Field(description="正文内容")
    updated_at: float = Field(description="文件系统修改时间戳")
    derived_post_type: Optional[str] = Field(
        default=None, description="从路径推断的文章类型"
    )
    derived_category_slug: Optional[str] = Field(
        default=None, description="从路径推断的分类Slug"
    )
    is_category_index: bool = Field(
        default=False, description="是否为分类元数据文件(index.md)"
    )
