from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.git_ops.components.scanner import MDXScanner
from app.git_ops.components.serializer import PostSerializer
from app.git_ops.components.writer import FileWriter
from app.git_ops.git_client import GitClient
from sqlmodel.ext.asyncio.session import AsyncSession


class GitOpsContainer:
    """GitOps 依赖注入容器 - 管理所有 GitOps 相关的依赖"""

    def __init__(self, session: AsyncSession, content_dir: Optional[Path] = None):
        self.session = session
        self.content_dir = content_dir or Path(settings.CONTENT_DIR)

        # 核心组件初始化
        self.scanner = MDXScanner(self.content_dir)
        self.serializer = PostSerializer(session)
        self.writer = FileWriter(
            session=session, content_dir=self.content_dir, serializer=self.serializer
        )
        self.git_client = GitClient(self.content_dir)

        # 服务初始化（延迟加载）
        self._sync_service = None
        self._preview_service = None
        self._resync_service = None
        self._commit_service = None

    @property
    def sync_service(self):
        """获取同步服务（单例）"""
        if self._sync_service is None:
            from app.git_ops.services import SyncService

            self._sync_service = SyncService(self.session, self)
        return self._sync_service

    @property
    def preview_service(self):
        """获取预览服务（单例）"""
        if self._preview_service is None:
            from app.git_ops.services import PreviewService

            self._preview_service = PreviewService(self.session, self)
        return self._preview_service

    @property
    def resync_service(self):
        """获取重新同步服务（单例）"""
        if self._resync_service is None:
            from app.git_ops.services import ResyncService

            self._resync_service = ResyncService(self.session, self)
        return self._resync_service

    @property
    def commit_service(self):
        """获取提交服务（单例）"""
        if self._commit_service is None:
            from app.git_ops.services import CommitService

            self._commit_service = CommitService(self.session, self)
        return self._commit_service
