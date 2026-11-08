"""
预览服务 - 负责同步预览（Dry Run）
"""

import logging

from app.git_ops.components.comparator import PostComparator
from app.git_ops.exceptions import collect_errors
from app.git_ops.schema import PreviewChange, PreviewResult
from app.posts import cruds as post_crud

from .base import BaseGitOpsService

logger = logging.getLogger(__name__)


class PreviewService(BaseGitOpsService):
    """预览服务 - 负责同步预览（Dry Run）"""

    async def preview_sync(self) -> PreviewResult:
        """执行同步预览 (Dry Run)"""
        result = PreviewResult()

        # 1. 扫描文件系统
        scanned_posts = await self.scanner.scan_all()
        scanned_map = {p.file_path: p for p in scanned_posts}

        # 2. 获取数据库现状
        existing_posts = await post_crud.get_posts_with_source_path(self.session)

        # Database-only posts are informational; no reverse export is supported.
        from app.posts.model import Post
        from sqlmodel import select

        # 获取所有文章
        all_posts_stmt = select(Post)
        all_posts_result = await self.session.exec(all_posts_stmt)
        all_posts = list(all_posts_result.all())

        result.db_only_count = sum(not post.source_path for post in all_posts)

        processed_post_ids = set()

        # 3. 对比差异
        for file_path, scanned in scanned_map.items():
            # 跳过分类元数据文件，它们不属于文章同步逻辑
            if scanned.is_category_index:
                continue

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
        # 扫描不完整时不能把“未扫描到”误报成“待删除”。
        scan_incomplete = bool(
            getattr(self.scanner, "last_scan_errors", {})
            or getattr(self.scanner, "last_scan_incomplete", False)
        )
        if not scan_incomplete:
            for post in existing_posts:
                if post.id not in processed_post_ids:
                    result.to_delete.append(
                        PreviewChange(
                            file=post.source_path,
                            title=post.title,
                            changes=["delete"],
                        )
                    )

        # 5. 计算待同步总数
        # 注意：有错误的文件也算作待处理（需要修复后才能同步）
        result.git_pending_count = (
            len(result.to_create)
            + len(result.to_update)
            + len(result.to_delete)
            + len(result.errors)  # ← 添加错误数量
        )

        return result
