import asyncio
import logging
import time

from app.core.config import settings
from app.git_ops.components import (
    handle_post_create,
    handle_post_update,
    revalidate_nextjs_cache,
)
from app.git_ops.components.comparator import PostComparator

# git_ops的工具类
from app.git_ops.container import GitOpsContainer
from app.git_ops.exceptions import (
    GitError,
    GitOpsConfigurationError,
    collect_errors,
)
from app.git_ops.schema import PreviewChange, PreviewResult, SyncStats
from app.posts import crud as post_crud

# 业务板块
from app.posts import service as post_service
from app.users.model import User

# 数据库
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


LAST_SYNC_FILE = ".gitops_last_sync"


class GitOpsService:
    _sync_lock: asyncio.Lock = None

    @property
    def sync_lock(self) -> asyncio.Lock:
        if GitOpsService._sync_lock is None:
            GitOpsService._sync_lock = asyncio.Lock()
        return GitOpsService._sync_lock

    def __init__(self, session: AsyncSession):
        self.session = session
        self.container = GitOpsContainer(session)
        self.content_dir = self.container.content_dir
        self.scanner = self.container.scanner
        self.serializer = self.container.serializer
        self.git_client = self.container.git_client

    async def sync_all(self, default_user: User = None) -> SyncStats:
        """执行全量同步（扫描本地文件 -> 更新数据库）"""
        if self.sync_lock.locked():
            logger.warning("GitOps sync is already in progress, waiting for lock...")

        async with self.sync_lock:
            # 更新全量 sync 后，也要更新 hash，保证下次增量正常
            stats = await self._sync_all_impl(default_user)
            current_hash = await self.git_client.get_current_hash()
            await self._save_last_hash(current_hash)
            return stats

    async def sync_incremental(self, default_user: User = None) -> SyncStats:
        """执行增量同步（基于 Git Diff）"""
        if self.sync_lock.locked():
            logger.warning("GitOps sync is already in progress, waiting for lock...")

        async with self.sync_lock:
            # 1. 尝试获取上次同步的 Hash
            last_hash = await self._load_last_hash()

            # 如果没有记录，回退到全量同步
            if not last_hash:
                logger.info("No last sync record found. Falling back to full sync.")
                stats = await self._sync_all_impl(default_user)

                # 保存当前 hash
                current_hash = await self.git_client.get_current_hash()
                await self._save_last_hash(current_hash)
                return stats

            # 2. 执行 Git Pull
            # 使用 collect_errors 捕获错误，确保 pull 失败不影响后续操作
            if (self.content_dir / ".git").exists():
                stats = SyncStats()  # Initialize stats before using it
                async with collect_errors(stats, "Git Pull"):
                    logger.info("Attempting git pull...")
                    await self.git_client.pull()

            # 3. 获取差异文件
            try:
                current_hash = await self.git_client.get_current_hash()
                if current_hash == last_hash:
                    logger.info("No new commits. Sync is up to date.")
                    return SyncStats()

                changed_files = await self.git_client.get_changed_files(last_hash)
            except GitError as e:
                logger.warning(
                    f"Failed to calculate incremental diff: {e}. Falling back to full sync."
                )
                stats = await self._sync_all_impl(default_user)
                current_hash = await self.git_client.get_current_hash()
                await self._save_last_hash(current_hash)
                return stats

            logger.info(f"Incremental Sync: found {len(changed_files)} changed files.")

            # 4. 只处理变更的文件
            stats = await self._process_changed_files(changed_files, default_user)

            # 5. 更新 Hash
            await self._save_last_hash(current_hash)

            # 6. 刷新缓存
            if stats.added or stats.updated or stats.deleted:
                await revalidate_nextjs_cache(
                    settings.FRONTEND_URL, settings.REVALIDATE_SECRET
                )

            return stats

    async def _process_changed_files(
        self, files: list[str], default_user: User
    ) -> SyncStats:
        """处理文件变更列表"""
        stats = SyncStats()
        operating_user = await self._get_operating_user(default_user)
        processed_post_ids = set()

        # 预加载 DB 数据，虽然是增量，但为了 match_post 准确性，还是需要查一下 source_path 不为空的
        # 优化点：可以只查涉及的文件，但这里为了逻辑简单复用，暂时查全量路径或根据 path 查
        existing_posts = await post_crud.get_posts_with_source_path(self.session)

        for file_rel_path in files:
            # 忽略非 MDX/MD 文件的变更 (比如 .gitignore, README, .gitops_last_sync 等)
            if not file_rel_path.endswith((".md", ".mdx")):
                continue

            file_path = self.content_dir / file_rel_path

            async with collect_errors(stats, f"Syncing {file_rel_path}"):
                # 情况 A: 文件被删除
                if not file_path.exists():
                    # 查找对应的 Post（使用相对路径匹配）
                    post_to_delete = next(
                        (p for p in existing_posts if p.source_path == file_rel_path),
                        None,
                    )
                    if post_to_delete:
                        logger.info(f"Deleting post: {post_to_delete.source_path}")
                        await post_service.delete_post(
                            self.session, post_to_delete.id, current_user=operating_user
                        )
                        stats.deleted.append(file_rel_path)
                    continue

                # 情况 B: 文件新增或修改
                scanned = await self.scanner.scan_file(file_rel_path)  # 使用相对路径
                matched_post, is_move = await self.serializer.match_post(
                    scanned, existing_posts
                )

                if matched_post:
                    await handle_post_update(
                        self.session,
                        matched_post,
                        scanned,
                        file_path,  # 绝对路径 Path 对象（handle_post_update 需要）
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
                        file_rel_path,  # 相对路径字符串（handle_post_create 需要）
                        self.serializer,
                        operating_user,
                        self.content_dir,
                        stats,
                        processed_post_ids,
                    )

        return stats

    async def _load_last_hash(self) -> str | None:
        """加载上次同步的 Commit Hash"""
        hash_file = self.content_dir / LAST_SYNC_FILE
        if hash_file.exists():
            return hash_file.read_text().strip()
        return None

    async def _save_last_hash(self, commit_hash: str):
        """保存当前同步的 Commit Hash"""
        if not commit_hash:
            return
        hash_file = self.content_dir / LAST_SYNC_FILE
        hash_file.write_text(commit_hash)

    async def _sync_all_impl(self, default_user: User = None) -> SyncStats:
        """内部同步实现"""
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

    async def resync_post_metadata(
        self, post_id: str, default_user: User = None
    ) -> None:
        """
        重新同步指定文章的元数据（读取磁盘文件 -> 更新数据库）
        如果文件不存在或不是 file-backed，抛出异常。
        """
        from uuid import UUID

        from app.git_ops.exceptions import ScanError
        from app.posts.model import Post
        from fastapi import HTTPException

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
        # 使用 handle_post_update 复用更新逻辑，确保 Tags/Category 等关系正确处理
        # 避免直接 setattr 导致 relationship 字段类型错误 (AttributeError)
        stats = SyncStats()
        processed_post_ids = {post.id}

        # 构造绝对路径
        file_path = self.content_dir / post.source_path

        await handle_post_update(
            self.session,  # session
            post,  # matched_post
            scanned,  # scanned
            file_path,  # file_path (Absolute Path object)
            False,  # is_move
            self.serializer,  # serializer
            operating_user,  # operating_user
            self.content_dir,  # content_dir
            stats,  # stats
            processed_post_ids,  # processed_post_ids
        )

        # 6. 刷新缓存
        await revalidate_nextjs_cache(settings.FRONTEND_URL, settings.REVALIDATE_SECRET)

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

    async def auto_commit(self, message: str):
        """执行自动提交和推送

        Args:
            message: 提交信息
        """
        if not (self.content_dir / ".git").exists():
            logger.warning("Skipping auto-commit: Not a git repository")
            return

        logger.info(f"Starting auto-commit: {message}")
        await self.git_client.add(["."])
        await self.git_client.commit(message)
        await self.git_client.push()
        logger.info("Auto-commit finished successfully.")


async def run_background_sync():
    """
    后台任务：运行 Git 同步。
    """
    from app.core.db import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        logger.info("Starting background Git sync via Webhook...")
        service = GitOpsService(session)
        # Webhook 触发默认使用增量更新
        stats = await service.sync_incremental()
        logger.info(
            f"Background Git sync finished: "
            f"+{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)} "
            f"({stats.duration:.2f}s)"
        )
        if stats.errors:
            logger.warning(f"Background sync finished with {len(stats.errors)} errors")


async def run_background_commit(message: str = "Auto-save from Admin"):
    """
    后台任务：执行 Git Add/Commit/Push
    """
    from app.core.db import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        service = GitOpsService(session)
        await service.auto_commit(message)
