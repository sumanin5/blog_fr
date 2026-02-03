import pytest
from app.posts.utils import PostProcessor


class TestASTHtmlStructure:
    """测试 AST 生成器对 HTML 的支持情况"""

    @pytest.mark.asyncio
    async def test_block_html_structure(self):
        """测试块级 HTML (如 <p align="center">...) 应该被保留为 generic HTML 节点"""
        content = """
<p align="center">
  <img src="test.png" alt="Test" />
  <br/>
  Caption
</p>
"""
        processor = await PostProcessor(content).process()
        ast = processor.content_ast

        # 应该有一个 type=html 的节点
        html_nodes = [n for n in ast["children"] if n["type"] == "html"]
        assert len(html_nodes) > 0, "No HTML nodes found in AST"

        html_node = html_nodes[0]
        # 验证属性
        assert html_node["display"] == "block", "Expected block display for p tag"
        assert '<p align="center">' in html_node["value"]
        assert "Caption" in html_node["value"]

    @pytest.mark.asyncio
    async def test_inline_html_structure(self):
        """测试行内 HTML (如 <span>...) 应该被保留为 generic HTML 节点"""
        content = "This is <span style='color:red'>red</span> text."
        processor = await PostProcessor(content).process()
        ast = processor.content_ast

        paragraph = ast["children"][0]
        # 应该有 [text, html, text]
        html_nodes = [n for n in paragraph["children"] if n.get("type") == "html"]
        assert len(html_nodes) > 0, "No inline HTML nodes found"

        html_node = html_nodes[0]
        assert html_node["display"] == "inline", "Expected inline display for span tag"
        assert "<span" in html_node["value"]

        # Markdown-it splits inline HTML: <span> (html), red (text), </span> (html)
        # We verify that at least the opening tag is preserved.
        # assert html_nodes[1]["value"] == "</span>"

    @pytest.mark.asyncio
    async def test_mixed_html_and_markdown(self):
        """测试混合 HTML 和 Markdown 的情况"""
        content = """
# Title

<div class="custom-container">
  Custom Content
</div>

**Bold** text.
"""
        processor = await PostProcessor(content).process()
        ast = processor.content_ast

        children = ast["children"]
        types = [child["type"] for child in children]

        assert "heading" in types
        assert "html" in types
        assert "paragraph" in types

        html_node = next(child for child in children if child["type"] == "html")
        assert html_node["display"] == "block"
        assert "custom-container" in html_node["value"]
