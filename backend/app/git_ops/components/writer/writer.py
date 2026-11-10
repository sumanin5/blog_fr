import logging
from pathlib import Path
from typing import Any, List, Optional

from app.git_ops.components.serializer import PostSerializer
from app.git_ops.exceptions import GitOpsConfigurationError, GitOpsReadOnlyError
from app.posts.model import Post

from .file_operator import FileOperator
from .path_calculator import PathCalculator

logger = logging.getLogger(__name__)


class FileWriter:
    """旧版文件写入器；单向同步模式下所有写方法都会拒绝执行。"""

    def __init__(
        self,
        session=None,
        content_dir: Optional[Path] = None,
        serializer: Optional[PostSerializer] = None,
        path_calculator: Optional[PathCalculator] = None,
        file_operator: Optional[FileOperator] = None,
    ):
        from app.core.config import settings

        self.content_dir = content_dir or Path(settings.CONTENT_DIR)

        if serializer:
            self.serializer = serializer
        elif session:
            self.serializer = PostSerializer(session)
        else:
            raise GitOpsConfigurationError(
                "FileWriter requires a serializer or a session to create one"
            )

        self.path_calculator = path_calculator or PathCalculator(self.content_dir)
        self.file_operator = file_operator or FileOperator()

    async def write_post(
        self,
        post: Post,
        old_post: Optional[Post] = None,
        category_slug: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> str:
        """旧版文章导出入口，单向同步模式下拒绝执行。"""
        raise GitOpsReadOnlyError()

    async def delete_post(self, post: Post):
        """旧版物理删除文章入口，单向同步模式下拒绝执行。"""
        raise GitOpsReadOnlyError()

    @staticmethod
    def render_category_index(category: Any) -> str:
        """生成分类 index.md 的完整内容

        写入与“是否需要写入”的比较必须使用同一份内容，否则会每次都判定为变更。
        """
        import frontmatter

        meta = {
            "title": category.name,
            "hidden": not category.is_active,
            "category_id": str(category.id),
        }
        if category.icon_preset:
            meta["icon"] = category.icon_preset
        if category.sort_order != 0:
            meta["order"] = category.sort_order

        # 添加摘要字段
        if category.excerpt:
            meta["excerpt"] = category.excerpt

        # 封面处理（参考 posts 的做法）
        if category.cover_media_id:
            # 添加 UUID 格式的 ID
            meta["cover_media_id"] = str(category.cover_media_id)

            # 如果预加载了 cover_media，添加人类可读的文件名
            if hasattr(category, "cover_media") and category.cover_media:
                cover = category.cover_media
                if hasattr(cover, "original_filename"):
                    meta["cover"] = cover.original_filename

        # 添加 post_sort 字段 (API 更新回写)
        if category.post_sort_order:
            # 写入 post_sort 字段，保持与 GIT_SYNC_GUIDE 一致
            meta["post_sort"] = category.post_sort_order.value

        return frontmatter.dumps(frontmatter.Post(category.description or "", **meta))

    async def write_category(self, category: Any) -> Path:
        """旧版分类 index.md 回写入口，单向同步模式下拒绝执行。"""
        raise GitOpsReadOnlyError()
