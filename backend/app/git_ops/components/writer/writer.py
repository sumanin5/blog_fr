import logging
from pathlib import Path
from typing import List, Optional

from app.git_ops.components.serializer import PostSerializer
from app.git_ops.exceptions import FileOpsError, GitOpsConfigurationError
from app.posts.model import Post

from .file_operator import FileOperator
from .path_calculator import PathCalculator

logger = logging.getLogger(__name__)


class FileWriter:
    """物理文件写入器 - 协调器职责"""

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
        """执行文章写入并处理文件位移逻辑"""
        try:
            # 1. 序列化内容
            content = self.serializer.dump_to_string(post, tags, category_slug)

            # 2. 计算新路径
            target_abs_path, target_relative_path = (
                self.path_calculator.calculate_target_path(post, category_slug)
            )

            # 3. 处理重命名/移动
            if old_post and old_post.source_path:
                old_abs_path = self.content_dir / old_post.source_path
                if old_post.source_path != target_relative_path:
                    if old_abs_path.exists():
                        logger.info(
                            f"Moving file: {old_post.source_path} -> {target_relative_path}"
                        )
                        self.file_operator.move_file(old_abs_path, target_abs_path)
                    else:
                        logger.warning(
                            f"Old file not found for moving: {old_post.source_path}"
                        )

            # 4. 执行写入
            await self.file_operator.write_file(target_abs_path, content)

            return target_relative_path
        except FileOpsError:
            raise
        except Exception as e:
            raise FileOpsError(
                "Unexpected error during post write", detail=str(e)
            ) from e

    async def delete_post(self, post: Post):
        """物理删除文章"""
        if not post.source_path:
            return

        abs_path = self.content_dir / post.source_path
        try:
            await self.file_operator.delete_file(abs_path)
        except FileOpsError:
            raise
        except Exception as e:
            raise FileOpsError(
                "Unexpected error during post delete", path=str(abs_path), detail=str(e)
            ) from e
