from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.git_ops.git_client import GitClient
from app.git_ops.components.scanner import MDXScanner
from app.git_ops.components.serializer import PostSerializer
from app.git_ops.components.writer import FileWriter
from sqlmodel.ext.asyncio.session import AsyncSession


class GitOpsContainer:
    """GitOps 依赖注入容器"""

    def __init__(self, session: AsyncSession, content_dir: Optional[Path] = None):
        self.session = session
        self.content_dir = content_dir or Path(settings.CONTENT_DIR)

        # 核心组件初始化
        self.scanner = MDXScanner(self.content_dir)
        self.serializer = PostSerializer(session)
        self.writer = FileWriter(
            session=session, content_dir=self.content_dir, serializer=self.serializer
        )
        self.git_client = GitClient(self.content_dir)
