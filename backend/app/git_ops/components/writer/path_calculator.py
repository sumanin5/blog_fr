import re
from pathlib import Path
from typing import Optional, Tuple

from app.posts.model import Post

# 物理目录名称映射表 (Database Value -> Filesystem Folder)
POST_TYPE_DIR_MAP = {
    "article": "articles",
    "idea": "ideas",
}


class PathCalculator:
    """路径计算器 - 负责计算文件在磁盘上的物理路径"""

    def __init__(self, content_dir: Path):
        self.content_dir = content_dir

    def calculate_target_path(
        self, post: Post, category_slug: Optional[str] = None
    ) -> Tuple[Path, str]:
        """
        计算目标物理路径和相对路径

        Returns:
            (abs_path, relative_path)
        """
        cat_folder = category_slug if category_slug else "uncategorized"

        # 使用映射表获取物理目录名 (e.g. 'article' -> 'articles')
        raw_type = post.post_type.value
        type_folder = POST_TYPE_DIR_MAP.get(raw_type, raw_type)

        # 根据是否开启 JSX 决定扩展名
        ext = "mdx" if post.enable_jsx else "md"

        # 处理文件名
        safe_title = self._sanitize_filename(post.title)
        relative_dir = Path(type_folder) / cat_folder
        filename = f"{safe_title}.{ext}"

        target_relative_path = str(relative_dir / filename)
        target_abs_path = self.content_dir / relative_dir / filename

        return target_abs_path, target_relative_path

    def _sanitize_filename(self, filename: str) -> str:
        """清理文件名，保留可读性但剔除非法字符"""
        # 替换非法字符: < > : " / \ | ? *
        safe_name = re.sub(r'[<>:"/\\|?*]', "-", filename)
        # 替换控制字符
        safe_name = re.sub(r"[\000-\037]", "", safe_name)
        safe_name = safe_name.strip()

        if len(safe_name) > 100:
            safe_name = safe_name[:100]

        return safe_name
