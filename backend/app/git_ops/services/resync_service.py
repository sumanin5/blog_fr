"""
重新同步服务 - 负责单个文章的元数据重新同步
"""

import logging
from uuid import UUID

from app.core.config import settings
from app.git_ops.components import handle_post_update, revalidate_nextjs_cache
from app.git_ops.exceptions import ScanError
from app.git_ops.schema import SyncStats
from app.posts.model import Post
from app.users.model import User
from fastapi import HTTPException

from .base import BaseGitOpsService

logger = logging.getLogger(__name__)


class ResyncService(BaseGitOpsService):
    """重新同步服务 - 负责单个文章的元数据重新同步"""

    async def resync_post_metadata(
        self, post_id: str, default_user: User = None
    ) -> None:
        """
        重新同步指定文章的元数据（读取磁盘文件 -> 更新数据库）
        如果文件不存在或不是 file-backed，抛出异常。
        """
        # 1. 查找文章
        if isinstance(post_id, str):
            try:
                post_id = UUID(post_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid UUID")

        post = await self.session.get(Post, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        # 2. 验证 source_path
        if not post.source_path:
            raise HTTPException(
                status_code=400, detail="Post is not linked to a git file"
            )

        # 3. 验证文件存在并读取
        try:
            scanned = await self.scanner.scan_file(post.source_path)
            if not scanned:
                raise FileNotFoundError()
        except (ScanError, FileNotFoundError):
            raise HTTPException(
                status_code=400, detail=f"File not found on disk: {post.source_path}"
            )

        # 4. 获取用户
        operating_user = await self._get_operating_user(default_user)

        # 5. 更新元数据
        stats = SyncStats()
        processed_post_ids = {post.id}

        # 构造绝对路径
        file_path = self.content_dir / post.source_path

        await handle_post_update(
            self.session,
            post,
            scanned,
            file_path,
            False,  # is_move
            self.serializer,
            operating_user,
            self.content_dir,
            stats,
            processed_post_ids,
        )

        # 6. 刷新缓存
        await revalidate_nextjs_cache(settings.FRONTEND_URL, settings.REVALIDATE_SECRET)
