"""
重新同步服务 - 负责单个文章的元数据重新同步
"""

import logging
from pathlib import Path
from uuid import UUID

from app.core.config import settings
from app.git_ops.components import handle_post_update, revalidate_nextjs_cache
from app.git_ops.components.path_utils import normalize_source_path
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
        self, post_id: UUID | str, default_user: User | None = None
    ) -> None:
        async with self.container.repository_lock():
            await self._resync_post_metadata_locked(post_id, default_user)

    async def _resync_post_metadata_locked(
        self, post_id: UUID | str, default_user: User | None = None
    ) -> None:
        """
        重新同步指定文章的元数据（读取磁盘文件 -> 更新数据库）
        如果文件不存在或不是 file-backed，抛出异常。
        """
        await self.container.validate_content()
        # 1. 查找文章

        post_id = UUID(post_id) if isinstance(post_id, str) else post_id

        post = await self.session.get(Post, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        # 2. 验证 source_path
        if not post.source_path:
            raise HTTPException(
                status_code=400, detail="Post is not linked to a git file"
            )

        # 3. 验证文件存在并读取（兼容历史反斜杠/绝对路径）
        source_path = normalize_source_path(post.source_path, self.content_dir)
        candidate = Path(source_path)
        resolved = (
            candidate.resolve()
            if candidate.is_absolute()
            else (self.content_dir / source_path).resolve()
        )
        try:
            source_path = resolved.relative_to(
                self.content_dir.resolve()
            ).as_posix()
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Source path is outside content repository",
            )
        try:
            scanned = await self.scanner.scan_file(source_path)
            if not scanned:
                raise FileNotFoundError()
        except (ScanError, FileNotFoundError):
            raise HTTPException(
                status_code=400, detail=f"File not found on disk: {source_path}"
            )

        # 4. 获取用户
        operating_user = await self._get_operating_user(default_user)

        # 5. 更新元数据
        stats = SyncStats()
        processed_post_ids = {post.id}

        # 数据库追踪字段始终使用仓库相对路径。
        file_path = Path(source_path)

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
