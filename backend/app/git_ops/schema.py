"""
GitOps 模块的数据模型和 Schema
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SyncError(BaseModel):
    """同步过程中的错误记录 (对齐核心 ErrorDetail 结构)"""

    context: str  # 错误发生的上下文 (如文件路径或操作名)
    code: str  # 错误代码 (GITOPS_SYNC_ERROR, etc.)
    message: str  # 错误简述
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class SyncStats(BaseModel):
    """Git 同步统计信息
    包含增删改查的四套路径，错误处理和耗时"""

    added: List[str] = []
    updated: List[str] = []
    deleted: List[str] = []
    skipped: int = 0
    errors: List[SyncError] = []
    duration: float = 0.0


class PreviewChange(BaseModel):
    """预览中的单个变更"""

    file: str | None = None
    title: str
    changes: List[str] = []


class PreviewResult(BaseModel):
    """Git 同步预览结果"""

    to_create: List[PreviewChange] = []
    to_update: List[PreviewChange] = []
    to_delete: List[PreviewChange] = []
    errors: List[SyncError] = []


class ResyncMetadataResponse(BaseModel):
    """重新同步元数据结果"""

    status: str
    post_id: str
    source_path: str
    updated_fields: Dict[str, Any]


class OperationResponse(BaseModel):
    """通用操作响应"""

    status: str
    message: Optional[str] = None


class WebhookResponse(BaseModel):
    """Webhook 响应"""

    status: str
