"""
GitOps 服务基类 - 提供共享逻辑
"""

import logging

from app.git_ops.exceptions import GitOpsConfigurationError
from app.users.model import User
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


class BaseGitOpsService:
    """GitOps 服务基类 - 通过容器获取依赖"""

    def __init__(self, session: AsyncSession, container=None):
        """
        初始化服务

        Args:
            session: 数据库会话
            container: GitOpsContainer 实例（可选，用于依赖注入）
        """
        self.session = session

        # 如果提供了容器，使用容器的依赖
        if container:
            self.container = container
            self.content_dir = container.content_dir
            self.scanner = container.scanner
            self.serializer = container.serializer
            self.git_client = container.git_client
            self.github = container.github
            self.hash_manager = container.hash_manager
            self.sync_processor = container.sync_processor
        else:
            # 向后兼容：如果没有容器，自己创建依赖
            from app.git_ops.container import GitOpsContainer

            self.container = GitOpsContainer(session)
            self.content_dir = self.container.content_dir
            self.scanner = self.container.scanner
            self.serializer = self.container.serializer
            self.git_client = self.container.git_client

    async def _get_operating_user(self, default_user: User | None = None) -> User:
        """获取操作用户，如果没有提供则查找 superadmin"""
        if default_user:
            return default_user

        from app.users import crud

        operating_user = await crud.get_superuser(self.session)
        if not operating_user:
            raise GitOpsConfigurationError(
                "No user provided and no superuser found. Cannot assign author to git-synced posts."
            )
        return operating_user
