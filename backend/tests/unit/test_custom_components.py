"""
自定义组件处理器的单元测试
"""

from app.posts.custom_components import (
    CustomComponentRegistry,
    process_custom_containers,
    restore_custom_components,
)


class TestCustomComponentRegistry:
    """测试自定义组件注册表"""

    def test_render_interactive_button(self):
        """测试交互式按钮渲染"""
        props = {"text": "Click me", "message": "Hello!", "variant": "primary"}
        html = CustomComponentRegistry.render_interactive_button(props)

        assert 'data-component="interactive-button"' in html
        assert "Click me" in html
        assert "bg-primary" in html

    def test_render_alert_info(self):
        """测试信息提示框"""
        props = {"type": "info", "title": "提示", "content": "这是内容"}
        html = CustomComponentRegistry.render_alert(props)

        assert 'data-component="alert"' in html
        assert "提示" in html
        assert "这是内容" in html
        assert "border-blue-200" in html

    def test_render_alert_warning(self):
        """测试警告提示框"""
        props = {"type": "warning", "content": "警告内容"}
        html = CustomComponentRegistry.render_alert(props)

        assert "border-yellow-200" in html

    def test_render_callout(self):
        """测试标注框"""
        props = {"emoji": "💡", "content": "重要提示"}
        html = CustomComponentRegistry.render_callout(props)

        assert 'data-component="callout"' in html
        assert "💡" in html
        assert "重要提示" in html


class TestProcessCustomContainers:
    """测试自定义容器处理"""

    def test_process_interactive_button(self):
        """测试处理交互式按钮容器"""
        content = """:::interactive-button
text: 点击我
message: Hello!
variant: primary
:::"""

        processed, placeholders = process_custom_containers(content)

        assert len(placeholders) == 1
        assert "CUSTOM_COMPONENT_PLACEHOLDER_0" in processed
        placeholder_html = list(placeholders.values())[0]
        assert 'data-component="interactive-button"' in placeholder_html

    def test_process_multiple_components(self):
        """测试处理多个组件"""
        content = """:::interactive-button
text: Button 1
:::

Some text

:::alert
type: info
title: Alert
:::"""

        processed, placeholders = process_custom_containers(content)

        assert len(placeholders) == 2
        assert "CUSTOM_COMPONENT_PLACEHOLDER_0" in processed
        assert "CUSTOM_COMPONENT_PLACEHOLDER_1" in processed

    def test_process_with_markdown(self):
        """测试与 Markdown 混合"""
        content = """# Title

:::callout
emoji: 🚀
快速提示
:::

Normal paragraph."""

        processed, placeholders = process_custom_containers(content)

        assert "# Title" in processed
        assert "Normal paragraph." in processed
        assert len(placeholders) == 1

    def test_unknown_component(self):
        """测试未知组件类型"""
        content = """:::unknown-component
some: value
:::"""

        processed, placeholders = process_custom_containers(content)

        # 未知组件应该保持原样
        assert ":::unknown-component" in processed
        assert len(placeholders) == 0

    def test_no_components(self):
        """测试没有自定义组件的内容"""
        content = "# Just normal markdown\n\nWith some text."

        processed, placeholders = process_custom_containers(content)

        assert processed == content
        assert len(placeholders) == 0


class TestRestoreCustomComponents:
    """测试组件恢复"""

    def test_restore_simple(self):
        """测试简单恢复"""
        html = "<p>CUSTOM_COMPONENT_PLACEHOLDER_0</p>"
        placeholders = {
            "CUSTOM_COMPONENT_PLACEHOLDER_0": '<button data-component="test">Click</button>'
        }

        result = restore_custom_components(html, placeholders)

        assert '<button data-component="test">Click</button>' in result
        assert "CUSTOM_COMPONENT_PLACEHOLDER_0" not in result

    def test_restore_wrapped_in_p(self):
        """测试恢复被 <p> 包裹的占位符"""
        html = "<p>CUSTOM_COMPONENT_PLACEHOLDER_0</p>"
        placeholders = {"CUSTOM_COMPONENT_PLACEHOLDER_0": "<div>Component</div>"}

        result = restore_custom_components(html, placeholders)

        # 应该移除 <p> 标签
        assert "<div>Component</div>" in result
        assert "<p>" not in result or result.count("<p>") == 0

    def test_restore_multiple(self):
        """测试恢复多个占位符"""
        html = """<h1>Title</h1>
<p>CUSTOM_COMPONENT_PLACEHOLDER_0</p>
<p>Text</p>
<p>CUSTOM_COMPONENT_PLACEHOLDER_1</p>"""

        placeholders = {
            "CUSTOM_COMPONENT_PLACEHOLDER_0": "<div>Component 1</div>",
            "CUSTOM_COMPONENT_PLACEHOLDER_1": "<div>Component 2</div>",
        }

        result = restore_custom_components(html, placeholders)

        assert "<div>Component 1</div>" in result
        assert "<div>Component 2</div>" in result
        assert "CUSTOM_COMPONENT_PLACEHOLDER" not in result


class TestIntegration:
    """集成测试"""

    def test_full_workflow(self):
        """测试完整工作流程"""
        content = """# Article

:::interactive-button
text: Click me
message: Hello!
:::

Some text.

:::alert
type: warning
title: Warning
Be careful!
:::"""

        # 第一步：处理容器
        processed, placeholders = process_custom_containers(content)

        assert len(placeholders) == 2
        assert "# Article" in processed
        assert "Some text." in processed

        # 模拟 markdown 渲染（简化）
        html = processed.replace("# Article", "<h1>Article</h1>")
        html = html.replace("Some text.", "<p>Some text.</p>")

        # 第二步：恢复组件
        final = restore_custom_components(html, placeholders)

        assert 'data-component="interactive-button"' in final
        assert 'data-component="alert"' in final
        assert "Click me" in final
        assert "Warning" in final
        assert "Be careful!" in final
