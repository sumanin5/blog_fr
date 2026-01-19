import logging
import shutil
from pathlib import Path
from typing import Optional

import aiofiles
from app.core.config import settings
from app.git_ops.dumper import PostDumper
from app.posts.model import Post

logger = logging.getLogger(__name__)


class FileWriter:
    """
    文件写入器：负责将 Post 对象写入物理磁盘
    """

    def __init__(self, content_dir: Path = None):
        self.content_dir = content_dir or Path(settings.CONTENT_DIR)

    async def write_post(
        self,
        post: Post,
        old_post: Optional[Post] = None,
        category_slug: str = None,
        tags: list[str] = None,
    ) -> str:
        """
        写入文章到磁盘

        Args:
            post: 当前文章对象
            old_post: 旧文章对象（用于检测重命名/移动）
            category_slug: 分类 Slug (用于构建路径)
            tags: 标签名称列表 (用于写入 Frontmatter)

        Returns:
            写入的相对路径
        """
        # 1. 序列化内容
        content = PostDumper.dump(post, tags, category_slug)

        # 2. 计算目标路径
        # 规则: content/{post_type}/{category_slug}/{title}.{ext}
        # 如果没有分类，则 content/{post_type}/uncategorized/{title}.{ext}
        cat_folder = category_slug if category_slug else "uncategorized"
        type_folder = post.post_type.value

        # 根据是否开启 JSX 决定扩展名
        ext = "mdx" if post.enable_jsx else "md"

        # 使用 safe_filename 处理标题，确保文件名合法
        safe_title = self._sanitize_filename(post.title)
        relative_dir = Path(type_folder) / cat_folder
        filename = f"{safe_title}.{ext}"
        target_dir = self.content_dir / relative_dir
        target_path = target_dir / filename
        target_relative_path = str(relative_dir / filename)

        # 3. 确保目录存在
        if not target_dir.exists():
            target_dir.mkdir(parents=True, exist_ok=True)

        # 4. 检测是否需要移动/重命名
        if old_post and old_post.source_path:
            old_abs_path = self.content_dir / old_post.source_path

            # 如果路径不同，且旧文件存在，则删除旧文件（或者移动）
            # 由于我们是用覆盖写入的方式，这里选择删除旧文件然后写入新文件
            if old_post.source_path != target_relative_path:
                if old_abs_path.exists():
                    logger.info(
                        f"Moving file: {old_post.source_path} -> {target_relative_path}"
                    )
                    # 使用 shutil.move 可以保留 git 历史吗？
                    # Git 通常是基于内容的，所以删除+新增 和 mv 效果类似，
                    # 但如果在 git 仓库内操作，最好后续执行 git mv。
                    # 这里我们先执行物理层面的移动
                    try:
                        shutil.move(str(old_abs_path), str(target_path))
                    except Exception as e:
                        logger.error(f"Failed to move file: {e}")
                        # 如果移动失败（例如目标已存在），尝试直接删除旧的
                        # old_abs_path.unlink(missing_ok=True)
                else:
                    logger.warning(f"Old source file not found: {old_post.source_path}")

        # 5. 写入内容 (覆盖)
        async with aiofiles.open(target_path, "w", encoding="utf-8") as f:
            await f.write(content)

        logger.info(f"File written to disk: {target_path}")
        return target_relative_path

    async def delete_post(self, post: Post):
        """删除物理文件"""
        if not post.source_path:
            logger.warning(f"Post {post.id} has no source_path, skipping file delete.")
            return

        abs_path = self.content_dir / post.source_path
        if abs_path.exists():
            try:
                abs_path.unlink()
                logger.info(f"Deleted file: {abs_path}")

                # 尝试清理空目录
                parent = abs_path.parent
                if not any(parent.iterdir()):
                    parent.rmdir()
                    logger.info(f"Removed empty directory: {parent}")
            except Exception as e:
                logger.error(f"Failed to delete file {abs_path}: {e}")
        else:
            logger.warning(f"File to delete not found: {abs_path}")

    def _sanitize_filename(self, filename: str) -> str:
        """
        清理文件名，保留人类可读性（中文、空格），只剔除系统非法字符
        """
        import re

        # 替换文件系统非法字符: < > : " / \ | ? *
        safe_name = re.sub(r'[<>:"/\\|?*]', "-", filename)

        # 替换控制字符 (如换行符等)
        safe_name = re.sub(r"[\000-\037]", "", safe_name)

        # 去除首尾空白
        safe_name = safe_name.strip()

        # 限制长度 (Linux/Windows 文件名通常限制 255 字节，UTF-8 中文占3字节)
        # 简单截断防止报错
        if len(safe_name) > 100:
            safe_name = safe_name[:100]

        return safe_name
