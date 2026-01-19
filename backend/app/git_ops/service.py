import logging
import time
from pathlib import Path
from typing import Dict, List

from app.core.config import settings

# git_ops的工具类
from app.git_ops.container import GitOpsContainer
from app.git_ops.exceptions import GitOpsConfigurationError, GitOpsSyncError
from app.git_ops.git_client import GitClient, GitError
from app.git_ops.schema import PreviewChange, PreviewResult, SyncStats
from app.git_ops.components import (
    handle_post_create,
    handle_post_update,
    revalidate_nextjs_cache,
    validate_post_for_resync,
)

# 业务板块
from app.posts import service as post_service
from app.posts.model import Post
from app.users.model import User, UserRole

# 数据库
from sqlmodel import select
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
        operating_user = default_user
        if not operating_user:
            stmt = select(User).where(User.role == UserRole.SUPERADMIN).limit(1)
            result = await self.session.exec(stmt)
            operating_user = result.first()
            if not operating_user:
                raise GitOpsConfigurationError(
                    "No user provided and no superuser found. Cannot assign author to git-synced posts."
                )

        # 0.5 Git Pull
        try:
            logger.info("Attempting git pull...")
            pull_output = await self.git_client.pull()
            logger.info(f"Git pull result: {pull_output}")
        except GitError as e:
            logger.warning(f"Git pull failed: {e}")
            # 继续执行本地扫描，不中断

        # 1. 扫描文件系统
        scanned_posts = await self.scanner.scan_all()
        scanned_map = {p.file_path: p for p in scanned_posts}
        logger.info(f"Scanned {len(scanned_posts)} files.")

        # 2. 获取数据库现状
        stmt = select(Post).where(Post.source_path.isnot(None))
        result = await self.session.exec(stmt)
        existing_posts = result.all()

        # 记录本次处理过的 Post ID
        processed_post_ids = set()

        # 3. 处理每个文件
        for file_path, scanned in scanned_map.items():
            try:
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

            except GitOpsSyncError as e:
                # 业务逻辑错误（如必填字段缺失），记录并跳过
                logger.error(f"Sync error for {file_path}: {e.message}")
                stats.errors.append(f"{file_path}: {e.message}")
            except Exception as e:
                # 未知错误，记录并跳过
                logger.exception(f"Unexpected error syncing {file_path}")
                stats.errors.append(f"{file_path}: {str(e)}")

        # 4. 处理删除
        for post in existing_posts:
            if post.id not in processed_post_ids:
                logger.info(f"Deleting post: {post.source_path} (slug={post.slug})")
                try:
                    await post_service.delete_post(
                        self.session, post.id, current_user=operating_user
                    )
                    stats.deleted.append(post.source_path)
                except Exception as e:
                    logger.error(f"Failed to delete post {post.source_path}: {e}")
                    stats.errors.append(f"Delete failed {post.source_path}: {e}")

        stats.duration = time.time() - start_time
        logger.info(
            f"Sync completed in {stats.duration:.2f}s: +{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)}"
        )

        # 5. 刷新缓存 (Best effort)
        if stats.added or stats.updated or stats.deleted:
            try:
                await revalidate_nextjs_cache(
                    settings.FRONTEND_URL, settings.REVALIDATE_SECRET
                )
            except Exception as e:
                logger.warning(f"Failed to revalidate Next.js cache: {e}")

        return stats

    async def preview_sync(self, default_user: User = None) -> PreviewResult:
        """执行同步预览 (Dry Run)"""
        result = PreviewResult()

        # 0. 确定操作用户
        operating_user = default_user
        if not operating_user:
            stmt = select(User).where(User.role == UserRole.SUPERADMIN).limit(1)
            res = await self.session.exec(stmt)
            operating_user = res.first()
            if not operating_user:
                logger.warning("No operating user found for preview.")

        # 1. 扫描文件系统
        scanned_posts = await self.scanner.scan_all()
        scanned_map = {p.file_path: p for p in scanned_posts}

        # 2. 获取数据库现状
        stmt = select(Post).where(Post.source_path.isnot(None))
        db_res = await self.session.exec(stmt)
        existing_posts = db_res.all()
        processed_post_ids = set()

        # 3. 对比差异
        for file_path, scanned in scanned_map.items():
            try:
                matched_post, is_move = await self.serializer.match_post(
                    scanned, existing_posts
                )

                if matched_post:
                    # === UPDATE ===
                    processed_post_ids.add(matched_post.id)
                    new_data = await self.serializer.from_frontmatter(
                        scanned, dry_run=True
                    )

                    # 计算字段差异
                    changes = []
                    if matched_post.title != new_data.get("title"):
                        changes.append("title")
                    if matched_post.content_mdx != new_data.get("content_mdx"):
                        changes.append("content")
                    if matched_post.excerpt != new_data.get("excerpt"):
                        changes.append("excerpt")
                    if str(matched_post.category_id) != str(
                        new_data.get("category_id")
                    ):
                        changes.append("category")

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

            except Exception as e:
                logger.error(f"Preview error for {file_path}: {e}")

        # 4. 删除检测
        for post in existing_posts:
            if post.id not in processed_post_ids:
                result.to_delete.append(
                    PreviewChange(
                        file=post.source_path, title=post.title, changes=["delete"]
                    )
                )

        return result

    async def resync_metadata(self, post_id, current_user: User) -> dict:
        """重新同步单个文章的元数据"""
        post = await validate_post_for_resync(self.session, self.content_dir, post_id)
        scanned = await self.scanner.scan_file(post.source_path)

        # 构造上下文调用 handle_post_update (强制写入)
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
            force_write=True,
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


async def run_background_sync():
    """
    后台任务：运行 Git 同步。

    这个函数被 BackgroundTasks 调用，用于异步执行 Git 同步。
    它会自动查找 Superuser 作为默认作者。
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
                    f"Sync completed with {len(stats.errors)} errors: {stats.errors}"
                )
    except GitOpsConfigurationError as e:
        logger.error(f"Configuration error during sync: {e}")
    except Exception as e:
        logger.exception(f"Unexpected error during background sync: {e}")


async def run_background_commit(message: str = "Auto-save from Admin"):
    """
    后台任务：执行 Git Add/Commit/Push
    """
    try:
        content_dir = Path(settings.CONTENT_DIR)
        if not content_dir.exists():
            return

        client = GitClient(content_dir)

        # 只提交 content 目录下的变更，防止提交其他意外文件
        # 但 GitClient 的 cwd 是 content_dir，所以 add . 就是 add content_dir
        logger.info("Starting background auto-commit...")
        await client.add(["."])
        await client.commit(message)
        await client.push()
        logger.info("Background auto-commit finished successfully.")
    except Exception as e:
        logger.error(f"Background auto-commit failed: {e}")
