from pathlib import Path
from typing import Dict, Optional

from app.posts.model import PostType


class PathParser:
    """路径解析器 - 从文件路径提取元数据"""

    def __init__(self):
        # 动态构建映射：支持单数和复数(简单+s)
        self.type_mapping = {}
        for t in PostType:
            val = t.value
            self.type_mapping[val] = val  # 支持单数目录 "article"
            self.type_mapping[f"{val}s"] = val  # 支持复数目录 "articles"

    def parse(self, rel_path: str) -> Dict[str, Optional[str]]:
        """
        解析文件路径，提取 post_type 和 category

        规则：
        - {post_type_plural}/{category_slug}/{filename} -> {type, category}
        - {post_type_plural}/{filename} -> {type, category=None}
        - {filename} -> {type=None, category=None}
        """
        path = Path(rel_path)
        parts = path.parts

        if len(parts) >= 3:
            # content/articles/tech/post.mdx -> parts=('articles', 'tech', 'post.mdx')
            dir_type = parts[0]
            category_slug = parts[1].lower()  # 分类 Slug 统一小写
            post_type = self.type_mapping.get(dir_type.lower())
            return {
                "post_type": post_type,
                "category_slug": category_slug,
            }

        elif len(parts) == 2:
            # content/articles/post.mdx -> parts=('articles', 'post.mdx')
            dir_type = parts[0]
            post_type = self.type_mapping.get(dir_type.lower())
            return {
                "post_type": post_type,
                "category_slug": None,
            }

        return {"post_type": None, "category_slug": None}
