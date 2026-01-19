import logging
from pathlib import Path
from typing import List, Optional

from app.git_ops.components.serializer import PostSerializer
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

        # 如果传入了 serializer 就用，没传就尝试创建一个（需要 session）
        if serializer:
            self.serializer = serializer
        elif session:
            self.serializer = PostSerializer(session)
        else:
            # 这是一个潜在的设计问题，Writer 需要 dumper 功能，现在集成在 Serializer 里，而 Serializer 需要 session
            # 在旧代码中 PostDumper 不需要 session。
            # 为了兼容性，如果这里没 session，Writer 可能无法正确工作于某些场景，
            # 但 Writer 主要用 dump_to_string，这个方法其实不需要 session (只用 FIELD_DEFINITIONS)
            # 所以我们可以暂时允许 serializer 为 None，或者重构 serializer 让 dump 不需要 session
            # 也可以在这里不仅构造 PostSerializer，而是允许外部注入
            raise ValueError(
                "FileWriter now requires a serializer or a session to create one"
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
                    logger.warning(f"Old file not found: {old_post.source_path}")

        # 4. 执行写入
        await self.file_operator.write_file(target_abs_path, content)

        return target_relative_path

    async def delete_post(self, post: Post):
        """物理删除文章"""
        if not post.source_path:
            return

        abs_path = self.content_dir / post.source_path
        await self.file_operator.delete_file(abs_path)
