"""
导出服务 - 负责将数据库中的文章导出到文件系统并提交到 Git
"""

import logging
from typing import Optional

from app.git_ops.exceptions import collect_errors
from app.git_ops.schema import SyncStats
from app.posts.model import Post
from app.users.model import User
from sqlalchemy.orm import selectinload
from sqlmodel import select

from .base import BaseGitOpsService

logger = logging.getLogger(__name__)


class ExportService(BaseGitOpsService):
    """导出服务 - 负责同步数据库文章到 Git 仓库"""

    async def export_to_git(
        self,
        post_id: Optional[str] = None,
        default_user: User = None,
        force_export: bool = False,
    ) -> SyncStats:
        """
        执行数据库到 Git 的导出。

        1. 查找需要同步的文章
        2. 写入物理文件
        3. 执行 Git Commit & Push
        """
        stats = SyncStats()
        operating_user = await self._get_operating_user(default_user)

        # 1. 查询所有相关文章
        # 直接查出所有文章，在内存中过滤，避免 SQL NULL/Empty String 问题
        statement = select(Post).options(
            selectinload(Post.category),
            selectinload(Post.tags),
            selectinload(Post.author),
        )

        if post_id:
            statement = statement.where(Post.id == post_id)

        results = await self.session.execute(statement)
        all_posts = results.scalars().all()

        # DEBUG: 打印所有文章的 source_path
        logger.info(f"[EXPORT DEBUG] Total posts in DB: {len(all_posts)}")
        for p in all_posts:
            logger.info(
                f"[EXPORT DEBUG] Post '{p.title}' (id={p.id}): "
                f"source_path={repr(p.source_path)}, "
                f"is_none={p.source_path is None}, "
                f"is_empty={p.source_path == ''}"
            )

        # 2. 在内存中过滤
        posts_to_export = []
        for post in all_posts:
            # 如果指定了 ID 或 强制导出，则包含
            if post_id or force_export:
                posts_to_export.append(post)
                logger.info(f"[EXPORT DEBUG] Including '{post.title}' (forced/by_id)")
                continue

            # 否则只导出 source_path 为空的文章
            if not post.source_path or post.source_path.strip() == "":
                posts_to_export.append(post)
                logger.info(f"[EXPORT DEBUG] Including '{post.title}' (no source_path)")

        logger.info(
            f"[EXPORT DEBUG] Posts to export after filtering: {len(posts_to_export)}"
        )

        if not posts_to_export:
            logger.info("No articles found to export.")
            return stats

        logger.info(f"Starting export of {len(posts_to_export)} articles to Git...")

        # 2. 逐篇执行导出
        for post in posts_to_export:
            async with collect_errors(stats, f"Exporting {post.title}"):
                # 获取作者
                author = post.author
                category_slug = post.category.slug if post.category else None
                tag_names = [t.name for t in post.tags]

                # 调用 FileWriter 执行写文件逻辑
                source_path = await self.container.writer.write_post(
                    post=post, category_slug=category_slug, tags=tag_names
                )

                # 更新数据库中的 source_path，建立关联
                post.source_path = source_path
                self.session.add(post)
                stats.updated.append(source_path)
                logger.info(f"Exported article '{post.title}' to {source_path}")

        await self.session.commit()

        # 3. 如果有变更，执行 Git 提交
        if stats.updated:
            message = f"chore: sync {len(stats.updated)} articles from dashboard"
            await self.container.commit_service.auto_commit(message)

        return stats
