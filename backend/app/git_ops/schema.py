"""
GitOps 模块的数据模型和 Schema
"""

from typing import List

from pydantic import BaseModel


class SyncStats(BaseModel):
    """Git 同步统计信息
    包含增删改查的四套路径，错误处理和耗时"""

    added: List[str] = []
    updated: List[str] = []
    deleted: List[str] = []
    skipped: int = 0
    errors: List[str] = []
    duration: float = 0.0


class PreviewChange(BaseModel):
    """预览中的单个变更"""

    file: str
    title: str
    changes: List[str] = []


class PreviewResult(BaseModel):
    """Git 同步预览结果"""

    to_create: List[PreviewChange] = []
    to_update: List[PreviewChange] = []
    to_delete: List[PreviewChange] = []
