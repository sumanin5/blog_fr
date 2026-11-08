from pathlib import Path
import asyncio
import json
from typing import Optional

from app.core.config import settings
from app.git_ops.components.github import GitHubComponent
from app.git_ops.components.handlers.file_processor import SyncProcessor
from app.git_ops.components.hash_manager import HashManager
from app.git_ops.components.repository_lock import lock_repository
from app.git_ops.components.scanner import MDXScanner
from app.git_ops.components.serializer import PostSerializer
from app.git_ops.git_client import GitClient
from app.git_ops.content_contract import MANIFEST, VERSION, validate, working_files
from app.git_ops.exceptions import GitOpsSyncError
from sqlmodel.ext.asyncio.session import AsyncSession


class GitOpsContainer:
    """GitOps 依赖注入容器 - 管理所有 GitOps 相关的依赖"""

    def __init__(self, session: AsyncSession, content_dir: Optional[Path] = None):
        self.session = session
        self.content_dir = content_dir or Path(settings.CONTENT_DIR)

        # 核心组件初始化
        self.scanner = MDXScanner(self.content_dir)
        self.serializer = PostSerializer(session)
        self.git_client = GitClient(self.content_dir)
        self.github = GitHubComponent(self.content_dir, self.git_client)
        self.hash_manager = HashManager(self.content_dir, self.git_client)
        self.sync_processor = SyncProcessor(
            self.scanner, self.serializer, self.content_dir
        )

        # 服务初始化（延迟加载）
        self._sync_service = None
        self._preview_service = None
        self._resync_service = None
        self._commit_service = None
        self._export_service = None

    def repository_lock(self):
        return lock_repository(
            self.hash_manager.last_sync_file.with_name(".gitops_sync.lock")
        )

    async def validate_content(self):
        """Strict v1 for migrated repositories; allow old checkouts during rollout."""
        manifest = self.content_dir / MANIFEST
        if not manifest.exists():
            return
        try:
            declaration = json.loads(manifest.read_text(encoding="utf-8"))
            if not isinstance(declaration, dict) or declaration.get("version") != VERSION:
                raise ValueError("Unsupported content contract version")
            errors = await asyncio.to_thread(lambda: validate(working_files(self.content_dir)))
        except (ValueError, OSError) as exc:
            raise GitOpsSyncError("Invalid content contract", detail=str(exc)) from exc
        if errors:
            raise GitOpsSyncError("Content validation failed before database import", detail="\n".join(errors))

    @property
    def export_service(self):
        """获取导出服务（单例）"""
        if self._export_service is None:
            from app.git_ops.services import ExportService

            self._export_service = ExportService(self.session, self)
        return self._export_service

    @property
    def sync_service(self):
        """获取同步服务（单例）"""
        if self._sync_service is None:
            from app.git_ops.services import SyncService

            self._sync_service = SyncService(self.session, self)
        return self._sync_service

    async def sync_all(self, default_user=None):
        """执行全量同步"""
        return await self.sync_service.sync_all(default_user)

    async def sync_incremental(self, default_user=None):
        """执行增量同步"""
        return await self.sync_service.sync_incremental(default_user)

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
