import logging
import time
from pathlib import Path
from typing import Any, Dict, List

from app.core.config import settings
from app.git_ops.exceptions import GitOpsConfigurationError, GitOpsSyncError
from app.git_ops.scanner import MDXScanner, ScannedPost
from app.posts import service as post_service
from app.posts.model import Post
from app.posts.schema import PostCreate, PostUpdate
from app.users.model import User, UserRole
from pydantic import BaseModel, ValidationError
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
        self.scanner = MDXScanner(self.content_dir)
        # self.git_client = GitClient(self.content_dir) # Reserved for git pull integration

    async def sync_all(self, default_user: User = None) -> SyncStats:
        """执行全量同步（扫描本地文件 -> 更新数据库）"""
        start_time = time.time()
        stats = SyncStats()

        logger.info("Starting GitOps sync...")

        if not self.content_dir.exists():
            raise GitOpsConfigurationError(
                f"Content directory not found: {self.content_dir}"
            )

        # 0. 确定操作用户 (作者)
        operating_user = default_user
        if not operating_user:
            # 如果没有指定（例如后台定时任务），则查找 Superuser
            stmt = select(User).where(User.role == UserRole.SUPERADMIN).limit(1)
            result = await self.session.exec(stmt)
            operating_user = result.first()

        if not operating_user:
            raise GitOpsConfigurationError(
                "No user provided and no superuser found. Cannot assign author to git-synced posts."
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

        # 3. 计算差异并执行

        # 3.1 处理新增和更新
        for file_path, scanned in scanned_map.items():
            try:
                await self._sync_single_file(
                    file_path, scanned, existing_map, operating_user, stats
                )
            except (GitOpsSyncError, ValidationError, ValueError) as e:
                # 仅捕获预期的同步错误，允许系统级错误冒泡（如果需要完全健壮性，可以捕获更多，但这里遵循用户要求不要滥用try）
                err_msg = f"Failed to sync {file_path}: {e}"
                logger.warning(err_msg)
                stats.errors.append(f"{file_path}: {str(e)}")

        # 3.2 处理删除
        for source_path, post in existing_map.items():
            if source_path not in scanned_map:
                try:
                    await post_service.delete_post(
                        self.session, post.id, current_user=operating_user
                    )
                    stats.deleted.append(source_path)
                except Exception as e:
                    # 删除失败通常不应该中断整个流程
                    err_msg = f"Failed to delete {source_path}: {e}"
                    logger.error(err_msg)
                    stats.errors.append(f"DELETE {source_path}: {str(e)}")

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

        # 映射字段
        # 如果 frontmatter 解析本身出错，scanner 应该已经处理了或者在此之前处理？
        # 目前 MDXScanner 比较简单，假设 scanned 结构是合法的

        if file_path in existing_map:
            # === UPDATE ===
            existing_post = existing_map[file_path]

            update_dict = self._map_frontmatter_to_post(scanned)
            try:
                post_in = PostUpdate(**update_dict)
            except ValidationError as e:
                raise GitOpsSyncError(
                    f"Validation error for update: {e}", detail=str(e)
                )

            await post_service.update_post(
                self.session,
                existing_post.id,
                post_in,
                current_user=default_author,
            )
            stats.updated.append(file_path)

        else:
            # === CREATE ===
            create_dict = self._map_frontmatter_to_post(scanned)
            create_dict["source_path"] = file_path

            # Slug Fallback
            if "slug" not in create_dict or not create_dict["slug"]:
                create_dict["slug"] = Path(file_path).stem

            try:
                post_in = PostCreate(**create_dict)
            except ValidationError as e:
                # Pydantic 校验错误
                raise GitOpsSyncError(
                    f"Validation error for create: {e}", detail=str(e)
                )

            await post_service.create_post(
                self.session, post_in, author_id=default_author.id
            )
            stats.added.append(file_path)

    def _map_frontmatter_to_post(self, scanned: ScannedPost) -> Dict[str, Any]:
        """将 Frontmatter 转换为 Post 模型字段"""
        meta = scanned.frontmatter
        return {
            "title": meta.get("title", Path(scanned.file_path).stem),
            "slug": meta.get("slug"),
            "excerpt": meta.get("summary") or meta.get("excerpt") or "",
            "content_mdx": scanned.content,
            "is_published": meta.get("published", True),
            "cover_image": meta.get("cover") or meta.get("image"),
            # Tags and Categories can be added here
        }
