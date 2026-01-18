import logging
import time
from pathlib import Path
from typing import Dict, List

from app.core.config import settings

# git_ops的工具类
from app.git_ops.error_handler import handle_sync_error, safe_operation
from app.git_ops.exceptions import GitOpsConfigurationError, GitOpsSyncError
from app.git_ops.git_client import GitClient, GitError
from app.git_ops.mapper import FrontmatterMapper
from app.git_ops.scanner import MDXScanner, ScannedPost
from app.git_ops.schema import PreviewChange, PreviewResult, SyncStats
from app.git_ops.utils import (
    revalidate_nextjs_cache,
    write_post_ids_to_frontmatter,
)

# 业务板块
from app.posts import service as post_service
from app.posts.model import Post
from app.posts.schema import PostCreate, PostUpdate
from app.users.model import User, UserRole

# 数据库
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


class GitOpsService:
    def __init__(self, session: AsyncSession):
        self.session = session

        if not hasattr(settings, "CONTENT_DIR"):
            raise GitOpsConfigurationError("settings.CONTENT_DIR not configured")

        self.content_dir = Path(settings.CONTENT_DIR)

        # ✅ 初始化时就检查目录是否存在
        if not self.content_dir.exists():
            raise GitOpsConfigurationError(
                f"Content directory not found: {self.content_dir}"
            )

        self.scanner = MDXScanner(self.content_dir)
        self.mapper = FrontmatterMapper(session)
        self.git_client = GitClient(self.content_dir)

    async def sync_all(self, default_user: User = None) -> SyncStats:
        """执行全量同步（扫描本地文件 -> 更新数据库）"""
        start_time = time.time()
        stats = SyncStats()

        logger.info("Starting GitOps sync...")

        # 0. 确定操作用户 (作者)
        operating_user = default_user
        if not operating_user:
            # 如果没有指定（例如后台定时任务），则查找 Superuser
            stmt = select(User).where(User.role == UserRole.SUPERADMIN).limit(1)
            result = await self.session.exec(stmt)
            operating_user = result.first()

            raise GitOpsConfigurationError(
                "No user provided and no superuser found. Cannot assign author to git-synced posts."
            )

        # 0.5 Git Pull (如果在 Git 仓库中)
        try:
            logger.info("Attempting git pull...")
            pull_output = await self.git_client.pull()
            logger.info(f"Git pull result: {pull_output}")
        except GitError as e:
            # 允许失败（例如：不是 Git 仓库，或者网络问题），降级为仅同步本地
            # 这不算作致命错误，只记录警告
            handle_sync_error(
                stats,
                error_msg=f"Git pull failed: {str(e)}",
                is_critical=False,
            )

        # 1. 扫描文件系统
        scanned_posts: List[ScannedPost] = await self.scanner.scan_all()
        scanned_map: Dict[str, ScannedPost] = {p.file_path: p for p in scanned_posts}

        logger.info(f"Scanned {len(scanned_posts)} files.")

        # 2. 获取数据库现状 (source_path is not None)
        stmt = select(Post).where(Post.source_path.isnot(None))
        result = await self.session.exec(stmt)
        existing_posts = result.all()
        existing_map: Dict[str, Post] = {
            p.source_path: p for p in existing_posts if p.source_path
        }
        # 构建 slug 映射用于检测移动 (Move Detection)
        existing_by_slug: Dict[str, Post] = {p.slug: p for p in existing_posts}

        # 记录本次同步处理过的 Post ID，用于后续判断删除
        processed_post_ids = set()

        # 3. 计算差异并执行

        # 3.1 处理新增和更新
        for file_path, scanned in scanned_map.items():
            try:
                await self._sync_single_file(
                    file_path,
                    scanned,
                    existing_map,
                    existing_by_slug,
                    processed_post_ids,
                    operating_user,
                    stats,
                )
            except GitOpsSyncError as e:
                # 业务逻辑错误（如缺少 author）应该记录到 errors
                handle_sync_error(
                    stats,
                    file_path=file_path,
                    error_msg=e.message,
                    is_critical=True,  # 业务逻辑错误是关键错误
                )
            except Exception as e:
                # 其他未预期的错误也记录到 errors
                handle_sync_error(
                    stats,
                    file_path=file_path,
                    error=e,
                    is_critical=True,  # 未预期错误也是关键错误
                )

        # 3.2 处理删除
        # 如果 Post 没被处理过，且它有 source_path，则视为被删除 (或者是被移动了但没匹配上)
        for post in existing_posts:
            if post.id not in processed_post_ids:
                logger.info(f"Deleting post: {post.source_path} (slug={post.slug})")
                success = await safe_operation(
                    lambda: post_service.delete_post(
                        self.session, post.id, current_user=operating_user
                    ),
                    stats,
                    operation_name="Delete post",
                    file_path=post.source_path,
                    is_critical=False,
                )
                if success:
                    stats.deleted.append(post.source_path)

        stats.duration = time.time() - start_time
        logger.info(
            f"Sync completed in {stats.duration:.2f}s: +{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)}"
        )

        # ✅ 同步完成后失效 Next.js 缓存（失败不影响同步结果）
        if stats.added or stats.updated or stats.deleted:
            await safe_operation(
                lambda: revalidate_nextjs_cache(
                    settings.FRONTEND_URL, settings.REVALIDATE_SECRET
                ),
                stats,
                operation_name="Revalidate Next.js cache",
                is_critical=False,
            )

        return stats

    async def _sync_single_file(
        self,
        file_path: str,
        scanned: ScannedPost,
        existing_map: Dict[str, Post],
        existing_by_slug: Dict[str, Post],
        processed_post_ids: set,
        default_author: User,
        stats: SyncStats,
    ):
        """处理单个文件的同步逻辑"""

        target_post = None
        is_move = False

        # 1. 尝试通过路径匹配
        if file_path in existing_map:
            target_post = existing_map[file_path]

        # 2. 如果路径不匹配，尝试通过 slug 匹配 (检测移动)
        elif scanned.frontmatter.get("slug"):
            fm_slug = scanned.frontmatter.get("slug")
            if fm_slug in existing_by_slug:
                target_post = existing_by_slug[fm_slug]
                # 确保这个 post 还没被处理过 (防止两个文件声明同一个 slug)
                if target_post.id in processed_post_ids:
                    raise GitOpsSyncError(
                        f"Duplicate slug '{fm_slug}' detected",
                        detail=f"Slug '{fm_slug}' is already claimed by another file in this sync.",
                    )
                is_move = True
                logger.info(
                    f"Detected file move: {target_post.source_path} -> {file_path}"
                )

        if target_post:
            # === UPDATE (or MOVE) ===
            update_dict = await self.mapper.map_to_post(scanned)

            # 如果是移动，更新 source_path
            if is_move:
                update_dict["source_path"] = file_path

            post_in = PostUpdate(**update_dict)

            updated_post = await post_service.update_post(
                self.session,
                target_post.id,
                post_in,
                current_user=default_author,
            )

            # ✅ 将更新后的 ID 写回到 frontmatter
            await write_post_ids_to_frontmatter(
                self.content_dir, file_path, updated_post, target_post, stats
            )

            processed_post_ids.add(target_post.id)
            stats.updated.append(file_path)

        else:
            # === CREATE ===
            create_dict = await self.mapper.map_to_post(scanned)
            create_dict["source_path"] = file_path

            # Slug 处理
            from app.posts.utils import generate_slug_with_random_suffix

            # 如果 Frontmatter 中没有指定 slug，则由系统生成（带随机后缀避免冲突）
            # 如果指定了，则直接使用（用户可能希望 URL 更干净）
            if create_dict.get("slug"):
                generated_slug = create_dict["slug"]
            else:
                generated_slug = generate_slug_with_random_suffix(Path(file_path).stem)

            create_dict["slug"] = generated_slug

            post_in = PostCreate(**create_dict)

            # author_id 已经在 create_dict 中（从 frontmatter 获取）
            created_post = await post_service.create_post(
                self.session,
                post_in,
                author_id=create_dict["author_id"],
            )

            # ✅ 将生成的 ID 写回到 MDX 文件的 frontmatter
            await write_post_ids_to_frontmatter(
                self.content_dir, file_path, created_post, None, stats
            )

            processed_post_ids.add(created_post.id)

            stats.added.append(file_path)

    async def preview_sync(self, default_user: User = None) -> PreviewResult:
        """执行同步预览 (Dry Run)"""
        result = PreviewResult()

        # 0. 确定操作用户 (用于 Mapper 解析默认作者 等)
        operating_user = default_user
        if not operating_user:
            stmt = select(User).where(User.role == UserRole.SUPERADMIN).limit(1)
            res = await self.session.exec(stmt)
            operating_user = res.first()
            if not operating_user:
                # 预览模式如果没有用户，可能导致 mapper 失败，但尽量继续
                logger.warning("No operating user found for preview.")

        # 1. 扫描文件系统
        scanned_posts: List[ScannedPost] = await self.scanner.scan_all()
        scanned_map: Dict[str, ScannedPost] = {p.file_path: p for p in scanned_posts}

        # 2. 获取数据库现状
        stmt = select(Post).where(Post.source_path.isnot(None))
        db_res = await self.session.exec(stmt)
        existing_posts = db_res.all()
        existing_map: Dict[str, Post] = {
            p.source_path: p for p in existing_posts if p.source_path
        }
        existing_by_slug: Dict[str, Post] = {p.slug: p for p in existing_posts}
        processed_post_ids = set()

        # 3. 对比差异
        for file_path, scanned in scanned_map.items():
            try:
                target_post = None

                # 匹配逻辑
                if file_path in existing_map:
                    target_post = existing_map[file_path]
                elif scanned.frontmatter.get("slug"):
                    fm_slug = scanned.frontmatter.get("slug")
                    if fm_slug in existing_by_slug:
                        target_post = existing_by_slug[fm_slug]
                        if target_post.id in processed_post_ids:
                            # 冲突忽略
                            continue

                if target_post:
                    # === UPDATE ===
                    processed_post_ids.add(target_post.id)

                    # 模拟映射
                    new_data = await self.mapper.map_to_post(scanned, dry_run=True)

                    # 计算字段差异
                    changes = []
                    # 简单比较几个关键字段
                    if target_post.title != new_data.get("title"):
                        changes.append("title")
                    if target_post.content_mdx != new_data.get("content_mdx"):
                        changes.append("content")
                    if target_post.excerpt != new_data.get("excerpt"):
                        changes.append("excerpt")
                    if str(target_post.category_id) != str(new_data.get("category_id")):
                        # new_data.category_id might be None if dry_run created it
                        # target_post.category_id might be UUID
                        changes.append("category")

                    if changes:
                        result.to_update.append(
                            PreviewChange(
                                file=file_path, title=target_post.title, changes=changes
                            )
                        )
                else:
                    # === CREATE ===
                    new_data = await self.mapper.map_to_post(scanned, dry_run=True)
                    result.to_create.append(
                        PreviewChange(
                            file=file_path,
                            title=new_data.get("title", "Untitled"),
                            changes=["new_file"],
                        )
                    )

            except Exception as e:
                logger.error(f"Preview error for {file_path}: {e}")
                # 预览出错，视作跳过或记录错误? 暂时忽略

        # 4. 删除检测
        for post in existing_posts:
            if post.id not in processed_post_ids:
                result.to_delete.append(
                    PreviewChange(
                        file=post.source_path, title=post.title, changes=["delete"]
                    )
                )

        return result


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
