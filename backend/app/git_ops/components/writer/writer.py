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

    async def write_category(self, category: Any) -> Path:
        """旧版分类 index.md 回写入口，单向同步模式下拒绝执行。"""
        raise GitOpsReadOnlyError()
