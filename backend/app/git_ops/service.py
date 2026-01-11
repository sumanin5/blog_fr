import logging
import time
from pathlib import Path
from typing import Dict, List

from app.core.config import settings
from app.git_ops.exceptions import GitOpsConfigurationError, GitOpsSyncError
from app.git_ops.git_client import GitClient, GitError
from app.git_ops.mapper import FrontmatterMapper
from app.git_ops.scanner import MDXScanner, ScannedPost
from app.posts import service as post_service
from app.posts.model import Post
from app.posts.schema import PostCreate, PostUpdate
from app.users.model import User, UserRole
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

logger = logging.getLogger(__name__)


class SyncStats(BaseModel):
    added: List[str] = []
    updated: List[str] = []
    deleted: List[str] = []
    skipped: int = 0
    errors: List[str] = []
    duration: float = 0.0


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
            # 这不算作同步错误，只记录警告日志
            logger.warning(f"Git pull skipped/failed: {e}")

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

        # 3. 计算差异并执行

        # 3.1 处理新增和更新
        for file_path, scanned in scanned_map.items():
            try:
                await self._sync_single_file(
                    file_path, scanned, existing_map, operating_user, stats
                )
            except GitOpsSyncError as e:
                # 捕获同步错误，记录到 errors 数组，继续处理其他文件
                error_msg = f"{file_path}: {e.message}"
                if e.details and "info" in e.details:
                    error_msg += f" ({e.details['info']})"
                stats.errors.append(error_msg)
                logger.error(f"Sync error for {file_path}: {e.message}")
            except Exception as e:
                # 其他未预期的错误也记录，但不中断整个同步
                error_msg = f"{file_path}: Unexpected error - {str(e)}"
                stats.errors.append(error_msg)
                logger.exception(f"Unexpected error syncing {file_path}")

        # 3.2 处理删除
        for source_path, post in existing_map.items():
            if source_path not in scanned_map:
                await post_service.delete_post(
                    self.session, post.id, current_user=operating_user
                )
                stats.deleted.append(source_path)

        stats.duration = time.time() - start_time
        logger.info(
            f"Sync completed in {stats.duration:.2f}s: +{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)}"
        )
        return stats

    async def _sync_single_file(
        self,
        file_path: str,
        scanned: ScannedPost,
        existing_map: Dict[str, Post],
        default_author: User,
        stats: SyncStats,
    ):
        """处理单个文件的同步逻辑"""

        if file_path in existing_map:
            # === UPDATE ===
            existing_post = existing_map[file_path]

            update_dict = await self.mapper.map_to_post(scanned)

            # ⚠️ 更新时不应该改变 slug（slug 是永久标识符）
            if "slug" in update_dict:
                del update_dict["slug"]

            post_in = PostUpdate(**update_dict)

            await post_service.update_post(
                self.session,
                existing_post.id,
                post_in,
                current_user=default_author,
            )
            stats.updated.append(file_path)

        else:
            # === CREATE ===
            create_dict = await self.mapper.map_to_post(scanned)
            create_dict["source_path"] = file_path

            # Slug 处理：即使 frontmatter 有 slug，也加随机后缀
            from app.posts.utils import generate_slug_with_random_suffix

            base_slug = create_dict.get("slug") or Path(file_path).stem
            generated_slug = generate_slug_with_random_suffix(base_slug)
            create_dict["slug"] = generated_slug

            post_in = PostCreate(**create_dict)

            # author_id 已经在 create_dict 中（从 frontmatter 获取）
            created_post = await post_service.create_post(
                self.session,
                post_in,
                author_id=create_dict["author_id"],
            )

            # ✅ 将生成的 slug 写回到 MDX 文件的 frontmatter
            await self._update_frontmatter_slug(file_path, generated_slug)

            stats.added.append(file_path)

    async def _update_frontmatter_slug(self, file_path: str, slug: str):
        """将生成的 slug 写回到 MDX 文件的 frontmatter

        Args:
            file_path: 相对于 content_dir 的文件路径
            slug: 生成的 slug
        """
        import frontmatter

        full_path = self.content_dir / file_path

        try:
            # 读取文件
            with open(full_path, "r", encoding="utf-8") as f:
                post = frontmatter.load(f)

            # 更新 slug
            post.metadata["slug"] = slug

            # 写回文件
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(frontmatter.dumps(post))

            logger.info(f"Updated slug in frontmatter: {file_path} -> {slug}")
        except Exception as e:
            # 写回失败不应该中断同步流程，只记录警告
            logger.warning(f"Failed to update slug in {file_path}: {e}")
