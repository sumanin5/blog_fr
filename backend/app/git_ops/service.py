import logging
import time
from pathlib import Path

from app.core.config import settings
from app.git_ops.components import (
    handle_post_create,
    handle_post_update,
    revalidate_nextjs_cache,
    validate_post_for_resync,
)
from app.git_ops.components.comparator import PostComparator

# git_ops的工具类
from app.git_ops.container import GitOpsContainer
from app.git_ops.exceptions import (
    GitOpsConfigurationError,
    collect_errors,
)
from app.git_ops.git_client import GitClient
from app.git_ops.schema import PreviewChange, PreviewResult, SyncStats
from app.posts import crud as post_crud

# 业务板块
from app.posts import service as post_service
from app.posts.model import Post
from app.users.model import User

# 数据库
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


class GitOpsService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.container = GitOpsContainer(session)
        self.content_dir = self.container.content_dir
        self.scanner = self.container.scanner
        self.serializer = self.container.serializer
        self.git_client = self.container.git_client

    async def sync_all(self, default_user: User = None) -> SyncStats:
        """执行全量同步（扫描本地文件 -> 更新数据库）"""
        start_time = time.time()
        stats = SyncStats()

        logger.info("Starting GitOps sync...")

        # 0. 确定操作用户
        operating_user = await self._get_operating_user(default_user)

        # 0.5 Git Pull (Best effort)
        if (self.content_dir / ".git").exists():
            async with collect_errors(stats, "Git Pull"):
                logger.info("Attempting git pull...")
                pull_output = await self.git_client.pull()
                logger.info(f"Git pull result: {pull_output}")
        else:
            logger.info("Skip git pull: repository not initialized.")

        # 1. 扫描文件系统
        scanned_posts = await self.scanner.scan_all()
        scanned_map = {p.file_path: p for p in scanned_posts}
        logger.info(f"Scanned {len(scanned_posts)} files.")

        # 2. 获取数据库现状
        existing_posts = await post_crud.get_posts_with_source_path(self.session)

        # 记录本次处理过的 Post ID
        processed_post_ids = set()

        # 3. 处理每个文件
        for file_path, scanned in scanned_map.items():
            async with collect_errors(stats, f"Syncing {file_path}"):
                matched_post, is_move = await self.serializer.match_post(
                    scanned, existing_posts
                )

                if matched_post:
                    # 如果已经存在，则是更新的逻辑
                    await handle_post_update(
                        self.session,
                        matched_post,
                        scanned,
                        file_path,
                        is_move,
                        self.serializer,
                        operating_user,
                        self.content_dir,
                        stats,
                        processed_post_ids,
                    )
                else:
                    await handle_post_create(
                        self.session,
                        scanned,
                        file_path,
                        self.serializer,
                        operating_user,
                        self.content_dir,
                        stats,
                        processed_post_ids,
                    )

        # 4. 处理删除
        for post in existing_posts:
            if post.id not in processed_post_ids:
                async with collect_errors(stats, f"Deleting {post.source_path}"):
                    logger.info(f"Deleting post: {post.source_path} (slug={post.slug})")
                    await post_service.delete_post(
                        self.session, post.id, current_user=operating_user
                    )
                    stats.deleted.append(post.source_path)

        stats.duration = time.time() - start_time
        logger.info(
            f"Sync completed in {stats.duration:.2f}s: +{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)}"
        )

        # 5. 刷新缓存 (Best effort)
        if stats.added or stats.updated or stats.deleted:
            # revalidate_nextjs_cache 内部已经处理了异常
            await revalidate_nextjs_cache(
                settings.FRONTEND_URL, settings.REVALIDATE_SECRET
            )

        return stats

    async def preview_sync(self) -> PreviewResult:
        """执行同步预览 (Dry Run)"""
        result = PreviewResult()

        # 1. 扫描文件系统
        scanned_posts = await self.scanner.scan_all()
        scanned_map = {p.file_path: p for p in scanned_posts}

        # 2. 获取数据库现状
        existing_posts = await post_crud.get_posts_with_source_path(self.session)
        processed_post_ids = set()

        # 3. 对比差异
        for file_path, scanned in scanned_map.items():
            async with collect_errors(result, f"Previewing {file_path}"):
                matched_post, is_move = await self.serializer.match_post(
                    scanned, existing_posts
                )

                if matched_post:
                    # === UPDATE ===
                    processed_post_ids.add(matched_post.id)
                    new_data = await self.serializer.from_frontmatter(
                        scanned, dry_run=True
                    )

                    changes = PostComparator.compare(matched_post, new_data)

                    if changes:
                        result.to_update.append(
                            PreviewChange(
                                file=file_path,
                                title=matched_post.title,
                                changes=changes,
                            )
                        )
                else:
                    # === CREATE ===
                    new_data = await self.serializer.from_frontmatter(
                        scanned, dry_run=True
                    )
                    result.to_create.append(
                        PreviewChange(
                            file=file_path,
                            title=new_data.get("title", "Untitled"),
                            changes=["new_file"],
                        )
                    )

        # 4. 删除检测
        for post in existing_posts:
            if post.id not in processed_post_ids:
                result.to_delete.append(
                    PreviewChange(
                        file=post.source_path, title=post.title, changes=["delete"]
                    )
                )

        return result

    async def _sync_single_file(
        self, post: Post, current_user: User, force_write: bool = False
    ) -> Post:
        """同步单个文件的通用方法

        Args:
            post: 要同步的 Post 对象
            current_user: 操作用户
            force_write: 是否强制写回 frontmatter

        Returns:
            更新后的 Post 对象
        """
        scanned = await self.scanner.scan_file(post.source_path)
        stats = SyncStats()
        processed_ids = set()

        updated_post = await handle_post_update(
            session=self.session,
            matched_post=post,
            scanned=scanned,
            file_path=post.source_path,
            is_move=False,
            serializer=self.serializer,
            operating_user=current_user,
            content_dir=self.content_dir,
            stats=stats,
            processed_post_ids=processed_ids,
            force_write=force_write,
        )

        return updated_post

    async def resync_metadata(self, post_id, current_user: User) -> dict:
        """重新同步单个文章的元数据

        ⚠️ 废弃通知：此方法将在实现增量同步后被移除。

        增量同步实现后，用户可以直接调用 /sync 端点，系统会自动检测
        有变化的文件并进行同步，无需手动指定单个文章 ID。

        当前保留此方法作为临时方案，用于快速修复单个文章的元数据。
        """
        post = await validate_post_for_resync(self.session, self.content_dir, post_id)
        updated_post = await self._sync_single_file(
            post, current_user, force_write=True
        )

        logger.info(f"Metadata resynced successfully for post {post_id}")

        return {
            "status": "success",
            "post_id": str(post_id),
            "source_path": post.source_path,
            "updated_fields": {
                "author_id": str(updated_post.author_id),
                "cover_media_id": (
                    str(updated_post.cover_media_id)
                    if updated_post.cover_media_id
                    else None
                ),
                "category_id": (
                    str(updated_post.category_id) if updated_post.category_id else None
                ),
            },
        }

    async def _get_operating_user(self, default_user: User = None) -> User:
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


async def run_background_sync():
    """
    后台任务：运行 Git 同步。
    """
    from app.core.db import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as session:
            logger.info("Starting background Git sync via Webhook...")
            service = GitOpsService(session)
            stats = await service.sync_all()
            logger.info(
                f"Background Git sync finished: "
                f"+{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)} "
                f"({stats.duration:.2f}s)"
            )
            if stats.errors:
                logger.warning(
                    f"Background sync finished with {len(stats.errors)} errors"
                )
    except Exception as e:
        logger.exception(f"Fatal error in background sync: {e}")


async def run_background_commit(message: str = "Auto-save from Admin"):
    """
    后台任务：执行 Git Add/Commit/Push
    """
    try:
        content_dir = Path(settings.CONTENT_DIR)
        if not content_dir.exists():
            return

        client = GitClient(content_dir)

        logger.info("Starting background auto-commit...")
        await client.add(["."])
        await client.commit(message)
        await client.push()
        logger.info("Background auto-commit finished successfully.")
    except Exception as e:
        logger.error(f"Background auto-commit failed: {e}")
