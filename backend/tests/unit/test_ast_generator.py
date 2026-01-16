"""
AST 生成器测试

测试 markdown-it tokens 到 AST 的转换
"""

from app.posts.utils import PostProcessor


class TestBasicNodes:
    """测试基础节点转换"""

    def test_text_node(self):
        """测试文本节点"""
        content = "这是一段文字"
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        assert ast["type"] == "root"
        assert len(ast["children"]) > 0
        # 查找段落节点
        paragraph = ast["children"][0]
        assert paragraph["type"] == "paragraph"
        # 查找文本节点
        text_node = paragraph["children"][0]
        assert text_node["type"] == "text"
        assert text_node["value"] == "这是一段文字"

    def test_heading_nodes(self):
        """测试标题节点（所有级别）"""
        content = """# H1
## H2
### H3
#### H4
##### H5
###### H6
"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        headings = [node for node in ast["children"] if node["type"] == "heading"]
        assert len(headings) == 6

        # 验证每个级别
        for i, heading in enumerate(headings, 1):
            assert heading["level"] == i
            assert heading["children"][0]["value"] == f"H{i}"

    def test_paragraph_node(self):
        """测试段落节点"""
        content = "第一段\n\n第二段"
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        paragraphs = [node for node in ast["children"] if node["type"] == "paragraph"]
        assert len(paragraphs) == 2
        assert paragraphs[0]["children"][0]["value"] == "第一段"
        assert paragraphs[1]["children"][0]["value"] == "第二段"

    def test_list_nodes_unordered(self):
        """测试无序列表节点"""
        content = """- 项目 1
- 项目 2
- 项目 3
"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        list_node = ast["children"][0]
        assert list_node["type"] == "list"
        assert list_node["ordered"] is False
        assert len(list_node["children"]) == 3

        # 验证列表项
        for i, item in enumerate(list_node["children"], 1):
            assert item["type"] == "list-item"

    def test_list_nodes_ordered(self):
        """测试有序列表节点"""
        content = """1. 第一项
2. 第二项
3. 第三项
"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        list_node = ast["children"][0]
        assert list_node["type"] == "list"
        assert list_node["ordered"] is True
        assert len(list_node["children"]) == 3

    def test_emphasis_nodes(self):
        """测试强调节点（粗体、斜体、删除线）"""
        content = "这是 **粗体**、_斜体_ 和 ~~删除线~~"
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        paragraph = ast["children"][0]
        children = paragraph["children"]

        # 查找强调节点
        strong_node = next(node for node in children if node.get("type") == "strong")
        assert strong_node["children"][0]["value"] == "粗体"

        em_node = next(node for node in children if node.get("type") == "emphasis")
        assert em_node["children"][0]["value"] == "斜体"

        strike_node = next(
            node for node in children if node.get("type") == "strikethrough"
        )
        assert strike_node["children"][0]["value"] == "删除线"

    def test_link_node(self):
        """测试链接节点"""
        content = "[链接文本](https://example.com)"
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        paragraph = ast["children"][0]
        link_node = paragraph["children"][0]

        assert link_node["type"] == "link"
        assert link_node["href"] == "https://example.com"
        assert link_node["children"][0]["value"] == "链接文本"

    def test_image_node(self):
        """测试图片节点"""
        content = "![图片描述](https://example.com/image.jpg)"
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        paragraph = ast["children"][0]
        image_node = paragraph["children"][0]

        assert image_node["type"] == "image"
        assert image_node["src"] == "https://example.com/image.jpg"
        assert image_node["alt"] == "图片描述"

    def test_blockquote_node(self):
        """测试引用块节点"""
        content = "> 这是引用内容"
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        blockquote = ast["children"][0]
        assert blockquote["type"] == "blockquote"
        assert len(blockquote["children"]) > 0


class TestCodeBlocks:
    """测试代码块转换"""

    def test_code_block_without_language(self):
        """测试普通代码块"""
        content = """```
console.log("Hello");
```"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        code_node = ast["children"][0]
        assert code_node["type"] == "code"
        assert code_node["lang"] is None
        assert 'console.log("Hello");' in code_node["value"]

    def test_code_block_with_language(self):
        """测试带语言的代码块"""
        content = """```javascript
console.log("Hello");
```"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        code_node = ast["children"][0]
        assert code_node["type"] == "code"
        assert code_node["lang"] == "javascript"
        assert 'console.log("Hello");' in code_node["value"]

    def test_mermaid_diagram(self):
        """测试 Mermaid 图表"""
        content = """```mermaid
graph TD
    A --> B
```"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        mermaid_node = ast["children"][0]
        assert mermaid_node["type"] == "mermaid"
        assert "graph TD" in mermaid_node["value"]
        assert "A --> B" in mermaid_node["value"]

    def test_inline_code(self):
        """测试行内代码"""
        content = "这是 `行内代码` 示例"
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        paragraph = ast["children"][0]
        code_node = next(
            node for node in paragraph["children"] if node.get("type") == "code_inline"
        )
        assert code_node["value"] == "行内代码"


class TestMathFormulas:
    """测试数学公式转换"""

    def test_inline_math(self):
        """测试行内公式"""
        content = "这是行内公式：$E = mc^2$"
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        paragraph = ast["children"][0]
        math_node = next(
            node for node in paragraph["children"] if node.get("type") == "math"
        )
        assert math_node["display"] == "inline"
        assert math_node["value"] == "E = mc^2"

    def test_block_math(self):
        """测试块级公式"""
        content = """$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        math_node = ast["children"][0]
        assert math_node["type"] == "math"
        assert math_node["display"] == "block"
        assert "\\int" in math_node["value"]

    def test_mixed_math(self):
        """测试混合公式"""
        content = """行内公式 $x^2$ 和块级公式：

$$
y = mx + b
$$
"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        # 查找所有数学节点
        def find_math_nodes(node, result=None):
            if result is None:
                result = []
            if isinstance(node, dict):
                if node.get("type") == "math":
                    result.append(node)
                if "children" in node:
                    for child in node["children"]:
                        find_math_nodes(child, result)
            return result

        math_nodes = find_math_nodes(ast)
        assert len(math_nodes) == 2
        assert math_nodes[0]["display"] == "inline"
        assert math_nodes[1]["display"] == "block"


class TestComplexStructures:
    """测试复杂嵌套结构"""

    def test_nested_lists(self):
        """测试嵌套列表"""
        content = """- 项目 1
  - 子项目 1.1
  - 子项目 1.2
- 项目 2
"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        list_node = ast["children"][0]
        assert list_node["type"] == "list"
        # 验证有嵌套结构
        assert len(list_node["children"]) > 0

    def test_table(self):
        """测试表格"""
        content = """| 列1 | 列2 |
|-----|-----|
| A   | B   |
| C   | D   |
"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        table_node = ast["children"][0]
        assert table_node["type"] == "table"
        assert len(table_node["children"]) > 0

    def test_mixed_content(self):
        """测试混合内容"""
        content = """# 标题

这是段落，包含 **粗体** 和 `代码`。

```python
print("Hello")
```

- 列表项 1
- 列表项 2

> 引用内容
"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        # 验证包含多种节点类型
        node_types = {node["type"] for node in ast["children"]}
        assert "heading" in node_types
        assert "paragraph" in node_types
        assert "code" in node_types
        assert "list" in node_types
        assert "blockquote" in node_types


class TestEdgeCases:
    """测试边界情况"""

    def test_empty_content(self):
        """测试空内容"""
        content = ""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        assert ast["type"] == "root"
        assert ast["children"] == []

    def test_only_whitespace(self):
        """测试只有空白"""
        content = "   \n\n   "
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        assert ast["type"] == "root"
        # 空白应该被忽略
        assert len(ast["children"]) == 0

    def test_special_characters(self):
        """测试特殊字符"""
        content = "特殊字符：<>&\"'"
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        paragraph = ast["children"][0]
        text_node = paragraph["children"][0]
        assert "特殊字符" in text_node["value"]

    def test_very_long_content(self):
        """测试超长内容"""
        content = "# 标题\n\n" + "这是一段很长的文字。" * 100
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        assert ast["type"] == "root"
        assert len(ast["children"]) > 0

    def test_unicode_content(self):
        """测试 Unicode 内容"""
        content = "# 中文标题\n\n中文内容 🎉 emoji"
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        heading = ast["children"][0]
        assert heading["children"][0]["value"] == "中文标题"

        paragraph = ast["children"][1]
        assert "emoji" in paragraph["children"][0]["value"]


class TestASTStructure:
    """测试 AST 结构完整性"""

    def test_ast_has_root(self):
        """测试 AST 有根节点"""
        content = "# 标题"
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        assert "type" in ast
        assert ast["type"] == "root"
        assert "children" in ast
        assert isinstance(ast["children"], list)

    def test_all_nodes_have_type(self):
        """测试所有节点都有 type 字段"""
        content = """# 标题

段落内容，包含 **粗体** 和 [链接](https://example.com)。

```python
code
```
"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        def check_node_types(node):
            """递归检查所有节点都有 type"""
            if isinstance(node, dict):
                assert "type" in node, f"节点缺少 type 字段: {node}"
                if "children" in node:
                    for child in node["children"]:
                        check_node_types(child)

        check_node_types(ast)

    def test_ast_is_json_serializable(self):
        """测试 AST 可以序列化为 JSON"""
        import json

        content = """# 标题

内容包含 **粗体**、_斜体_ 和 `代码`。

```javascript
console.log("Hello");
```
"""
        processor = PostProcessor(content).process()
        ast = processor.content_ast

        # 应该可以序列化
        json_str = json.dumps(ast, ensure_ascii=False)
        assert json_str is not None

        # 应该可以反序列化
        parsed = json.loads(json_str)
        assert parsed["type"] == "root"


class TestASTConsistency:
    """测试 AST 与 HTML 的一致性"""
