"""
GitOps 主服务 - 门面模式

协调各个子服务，提供统一的 API 接口
使用 GitOpsContainer 进行依赖注入
"""

import logging

from app.git_ops.container import GitOpsContainer
from app.git_ops.schema import PreviewResult, SyncStats
from app.users.model import User
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


class GitOpsService:
    """GitOps 主服务 - 通过容器协调各个子服务"""

    def __init__(self, session: AsyncSession):
        self.session = session
        # 创建容器，容器负责管理所有依赖和服务
        self.container = GitOpsContainer(session)

    # ========================================
    # 同步相关方法 - 委托给 SyncService
    # ========================================

    async def sync_all(self, default_user: User = None) -> SyncStats:
        """执行全量同步（扫描本地文件 -> 更新数据库）"""
        return await self.container.sync_all(default_user)

    async def sync_incremental(self, default_user: User = None) -> SyncStats:
        """执行增量同步（基于 Git Diff）"""
        return await self.container.sync_incremental(default_user)

    # ========================================
    # 预览相关方法 - 委托给 PreviewService
    # ========================================

    async def preview_sync(self) -> PreviewResult:
        """执行同步预览 (Dry Run)"""
        return await self.container.preview_service.preview_sync()

    # ========================================
    # 重新同步相关方法 - 委托给 ResyncService
    # ========================================

    async def resync_post_metadata(
        self, post_id: str, default_user: User = None
    ) -> None:
        """
        重新同步指定文章的元数据（读取磁盘文件 -> 更新数据库）
        如果文件不存在或不是 file-backed，抛出异常。
        """
        return await self.container.resync_service.resync_post_metadata(
            post_id, default_user
        )

    # ========================================
    # Git 提交相关方法 - 委托给 CommitService
    # ========================================

    async def auto_commit(self, message: str):
        """执行自动提交和推送

        Args:
            message: 提交信息
        """
        return await self.container.commit_service.auto_commit(message)

    async def export_to_git(
        self, post_id: str = None, default_user: User = None
    ) -> SyncStats:
        """执行数据库到 Git 的同步导"""
        return await self.container.export_service.export_to_git(post_id, default_user)
