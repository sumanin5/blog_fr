from pathlib import Path
from typing import Dict, Optional

from app.posts.model import PostType
from slugify import slugify as python_slugify


class PathParser:
    """路径解析器 - 从文件路径提取元数据"""

    def __init__(self):
        # 动态构建映射：支持单数和复数
        # 无论内部枚举是 "article" 还是 "articles"，都兼容目录名 "article" 和 "articles"
        self.type_mapping = {}
        for t in PostType:
            val = t.value
            # 去掉可能的末尾 s 获取基准词
            base = val[:-1] if val.endswith("s") else val
            self.type_mapping[base] = val  # "article" -> "articles"
            self.type_mapping[f"{base}s"] = val  # "articles" -> "articles"

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
            # 使用 slugify 处理分类 slug，支持中文转拼音
            category_slug = python_slugify(parts[1])
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
