from abc import ABC, abstractmethod
from typing import Any, Dict

from app.git_ops.components.scanner import ScannedPost
from sqlmodel.ext.asyncio.session import AsyncSession


class FieldProcessor(ABC):
    """字段处理器基类"""

    @abstractmethod
    async def process(
        self,
        result: Dict[str, Any],
        meta: Dict[str, Any],
        scanned: ScannedPost,
        session: AsyncSession,
        dry_run: bool = False,
    ) -> None:
        """
        处理字段

        Args:
            result: 当前结果字典（会被修改）
            meta: frontmatter 元数据
            scanned: 扫描的文件信息
            session: 数据库会话
            dry_run: 是否为预览模式
        """
        pass
