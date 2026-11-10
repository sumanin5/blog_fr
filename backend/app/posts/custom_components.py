"""
自定义 MDX 组件处理器

支持在 Markdown 中使用自定义容器语法，后端渲染成 HTML，前端 hydrate 添加交互
"""

import json
import re
from typing import Any, Dict, Tuple


class CustomComponentRegistry:
    """自定义组件注册表"""

    @staticmethod
    def render_interactive_button(props: Dict[str, Any]) -> str:
        """交互式按钮

        用法：
        :::interactive-button
        text: 点击我
        message: Hello!
        variant: primary
        :::
        """
        text = props.get("text", "Click me")
        variant = props.get("variant", "primary")

        # 样式映射
        variant_classes = {
            "primary": "bg-primary text-primary-foreground hover:bg-primary/90",
            "secondary": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            "destructive": "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        }

        classes = variant_classes.get(variant, variant_classes["primary"])

        return f"""<button
  class="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 {classes}"
  data-component="interactive-button"
  data-props='{json.dumps(props)}'
>
  {text}
</button>"""

    @staticmethod
    def render_alert(props: Dict[str, Any]) -> str:
        """提示框

        用法：
        :::alert
        type: info
        title: 注意
        这是提示内容
        :::
        """
        alert_type = props.get("type", "info")
        title = props.get("title", "")
        content = props.get("content", "")

        # 类型样式映射
        type_classes = {
            "info": "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
            "warning": "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
            "error": "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
            "success": "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
        }

        classes = type_classes.get(alert_type, type_classes["info"])

        title_html = f'<div class="font-semibold mb-1">{title}</div>' if title else ""

        return f"""<div class="my-4 rounded-lg border p-4 {classes}" data-component="alert" data-props='{json.dumps(props)}'>
  {title_html}
  <div>{content}</div>
</div>"""

    @staticmethod
    def render_callout(props: Dict[str, Any]) -> str:
        """标注框

        用法：
        :::callout
        emoji: 💡
        这是一个提示
        :::
        """
        emoji = props.get("emoji", "📝")
        content = props.get("content", "")

        return f"""<div class="my-4 flex gap-3 rounded-lg border border-border bg-muted/50 p-4" data-component="callout" data-props='{json.dumps(props)}'>
  <div class="text-2xl">{emoji}</div>
  <div class="flex-1">{content}</div>
</div>"""

    @staticmethod
    def render_tabs(props: Dict[str, Any]) -> str:
        """标签页

        用法：
        :::tabs
        tabs: ["Tab 1", "Tab 2"]
        Tab 1 内容
        ---
        Tab 2 内容
        :::
        """
        tabs = props.get("tabs", [])
        content = props.get("content", "")

        # 分割内容
        contents = content.split("---")

        tabs_html = "".join(
            [
                f'<button class="tab-button px-4 py-2 text-sm font-medium" data-tab="{i}">{tab}</button>'
                for i, tab in enumerate(tabs)
            ]
        )

        contents_html = "".join(
            [
                f'<div class="tab-content hidden" data-tab="{i}">{content.strip()}</div>'
                for i, content in enumerate(contents)
            ]
        )

        return f"""<div class="my-4 rounded-lg border border-border" data-component="tabs" data-props='{json.dumps(props)}'>
  <div class="flex border-b border-border">{tabs_html}</div>
  <div class="p-4">{contents_html}</div>
</div>"""

    @staticmethod
    def render_code_group(props: Dict[str, Any]) -> str:
        """代码组（多语言切换）

        用法：
        :::code-group
        languages: ["JavaScript", "Python"]
        console.log('Hello');
        ---
        print('Hello')
        :::
        """
        languages = props.get("languages", [])
        content = props.get("content", "")

        # 分割代码
        codes = content.split("---")

        langs_html = "".join(
            [
                f'<button class="code-lang-button px-3 py-1 text-xs font-medium" data-lang="{i}">{lang}</button>'
                for i, lang in enumerate(languages)
            ]
        )

        codes_html = "".join(
            [
                f'<pre class="code-block hidden" data-lang="{i}"><code>{code.strip()}</code></pre>'
                for i, code in enumerate(codes)
            ]
        )

        return f"""<div class="my-4 rounded-lg border border-border bg-muted/30" data-component="code-group" data-props='{json.dumps(props)}'>
  <div class="flex gap-2 border-b border-border p-2">{langs_html}</div>
  <div>{codes_html}</div>
</div>"""


def process_custom_containers(content: str) -> Tuple[str, Dict[str, str]]:
    """处理自定义容器，返回处理后的内容和占位符映射

    语法：
    :::component-name
    prop1: value1
    prop2: value2
    content here
    :::

    Returns:
        Tuple[str, Dict[str, str]]: (处理后的内容, {占位符: HTML})
    """
    import logging

    logger = logging.getLogger(__name__)
    registry = CustomComponentRegistry()

    # 匹配 :::component-name ... :::
    # 使用 \s* 匹配任意空白字符（包括换行），更灵活
    pattern = r":::(\w+[\w-]*)\s*\n(.*?)\n\s*:::"

    matches = list(re.finditer(pattern, content, flags=re.DOTALL))
    logger.info(f"Found {len(matches)} custom container matches")

    placeholders = {}
    counter = 0

    def replace_container(match):
        nonlocal counter
        component_type = match.group(1).strip().replace("-", "_")
        raw_content = match.group(2).strip()

        logger.info(f"Processing component: {component_type}")
        logger.debug(f"Raw content: {raw_content[:100]}...")

        # 解析属性和内容
        props = {}
        content_lines = []
        in_content = False

        for line in raw_content.split("\n"):
            if ":" in line and not in_content:
                # 尝试解析为属性
                parts = line.split(":", 1)
                if len(parts) == 2 and not parts[0].strip().startswith(" "):
                    key = parts[0].strip()
                    value = parts[1].strip()

                    # 尝试解析 JSON 数组
                    if value.startswith("[") and value.endswith("]"):
                        try:
                            props[key] = json.loads(value)
                        except Exception:
                            props[key] = value
                    else:
                        props[key] = value
                    continue

            # 其他行作为内容
            in_content = True
            content_lines.append(line)

        if content_lines:
            props["content"] = "\n".join(content_lines).strip()

        logger.info(f"Parsed props: {props}")

        # 查找对应的渲染方法
        render_method = getattr(registry, f"render_{component_type}", None)
        if render_method:
            html = render_method(props)
            logger.info(f"Rendered component: {component_type}")

            # 创建占位符（使用 base64 编码避免冲突）
            placeholder = f"CUSTOM_COMPONENT_PLACEHOLDER_{counter}"
            placeholders[placeholder] = html
            counter += 1

            # 返回占位符而不是 HTML（避免被 markdown 转义）
            return placeholder

        # 未知组件，返回原始内容
        logger.warning(f"Unknown component type: {component_type}")
        return match.group(0)

    processed_content = re.sub(pattern, replace_container, content, flags=re.DOTALL)
    return processed_content, placeholders


def restore_custom_components(html: str, placeholders: Dict[str, str]) -> str:
    """将占位符替换回实际的 HTML

    Args:
        html: 渲染后的 HTML
        placeholders: 占位符映射

    Returns:
        str: 替换后的 HTML
    """
    result = html
    for placeholder, component_html in placeholders.items():
        # 占位符可能被包裹在 <p> 标签中，需要处理
        result = result.replace(f"<p>{placeholder}</p>", component_html)
        result = result.replace(placeholder, component_html)
    return result
