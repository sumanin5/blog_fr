"""
测试路径解析器对中文目录名的处理
"""

import pytest
from app.git_ops.components.scanner.path_parser import PathParser


@pytest.mark.unit
class TestPathParserChinese:
    """测试中文路径解析"""

    @pytest.fixture
    def parser(self):
        return PathParser()

    def test_parse_chinese_category_slug(self, parser):
        """测试中文分类目录名被正确转换为拼音 slug"""
        # 测试中文目录名
        result = parser.parse("ideas/RL奥德赛/post.md")

        assert result["post_type"] == "ideas"
        assert result["category_slug"] == "rlao-de-sai"  # 中文转拼音（RL 和奥连在一起）

    def test_parse_mixed_chinese_english_category(self, parser):
        """测试中英文混合的分类目录名"""
        result = parser.parse("articles/技术分享/post.md")

        assert result["post_type"] == "articles"
        assert result["category_slug"] == "ji-zhu-fen-xiang"  # 技术的拼音是 ji-zhu

    def test_parse_english_category_unchanged(self, parser):
        """测试英文分类目录名保持不变"""
        result = parser.parse("articles/tech/post.md")

        assert result["post_type"] == "articles"
        assert result["category_slug"] == "tech"

    def test_parse_category_with_spaces(self, parser):
        """测试带空格的分类目录名"""
        result = parser.parse("ideas/My Ideas/post.md")

        assert result["post_type"] == "ideas"
        assert result["category_slug"] == "my-ideas"  # 空格转连字符

    def test_parse_category_with_special_chars(self, parser):
        """测试带特殊字符的分类目录名"""
        result = parser.parse("articles/C++编程/post.md")

        assert result["post_type"] == "articles"
        # slugify 会处理特殊字符
        assert "bian-cheng" in result["category_slug"]

    def test_parse_index_md_chinese_category(self, parser):
        """测试中文分类的 index.md"""
        result = parser.parse("ideas/RL奥德赛/index.md")

        assert result["post_type"] == "ideas"
        assert result["category_slug"] == "rlao-de-sai"  # RL 和奥连在一起
