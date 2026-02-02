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

        # 定义解析规则表：基于路径片段数量 (parts count) 的分发
        # 这种设计极其便于扩展，只需在此处添加 key 和对应的解析逻辑
        self.rules = {
            3: self._parse_category_depth,  # articles/tech/post.md
            2: self._parse_type_depth,  # articles/post.md
        }

    def parse(self, rel_path: str) -> Dict[str, Optional[str]]:
        """
        解析文件路径，动态分发至对应规则处理器。
        """
        path = Path(rel_path)
        parts = path.parts
        parts_count = len(parts)

        # 1. 查找对应层级的解析规则
        parser = self.rules.get(parts_count)
        if not parser:
            return {"post_type": None, "category_slug": None}

        # 2. 执行具体解析逻辑
        return parser(parts)

    def _parse_category_depth(self, parts: tuple) -> Dict[str, Optional[str]]:
        """处理格式: {type}/{category}/{file}"""
        dir_type = parts[0].lower()
        category_raw = parts[1]

        return {
            "post_type": self.type_mapping.get(dir_type),
            "category_slug": python_slugify(category_raw) if category_raw else None,
        }

    def _parse_type_depth(self, parts: tuple) -> Dict[str, Optional[str]]:
        """处理格式: {type}/{file}"""
        dir_type = parts[0].lower()

        return {
            "post_type": self.type_mapping.get(dir_type),
            "category_slug": None,
        }
