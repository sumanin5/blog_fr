"""
预览服务 - 负责同步预览（Dry Run）
"""

import logging

from app.git_ops.components.comparator import PostComparator
from app.git_ops.exceptions import collect_errors
from app.git_ops.schema import PreviewChange, PreviewResult
from app.posts import crud as post_crud

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
