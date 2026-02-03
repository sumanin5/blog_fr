"""
AST 生成器

将 markdown-it tokens 转换为结构化的 AST（抽象语法树）
"""

import re
from typing import Any, Dict, List, Optional


class ASTGenerator:
    """AST 生成器类"""

    def generate(self, tokens: List) -> Dict[str, Any]:
        """生成 AST（抽象语法树）

        Args:
            tokens: markdown-it 解析的 token 列表

        Returns:
            AST 字典，格式：{"type": "root", "children": [...]}
        """
        return self._tokens_to_ast(tokens)

    def _tokens_to_ast(self, tokens: List) -> Dict[str, Any]:
        """将 markdown-it tokens 转换为 AST

        使用栈式算法处理嵌套结构：
        1. 遇到 _open token，创建节点并入栈
        2. 遇到 _close token，出栈
        3. 遇到自闭合 token，直接添加到当前节点
        4. 处理 inline token 的子节点

        Args:
            tokens: markdown-it 解析的 token 列表

        Returns:
            AST 根节点
        """
        ast: Dict[str, Any] = {"type": "root", "children": []}
        stack: List[Dict[str, Any]] = [ast]  # 栈顶是当前节点
        slug_counter: Dict[str, int] = {}  # 用于生成唯一的标题 ID

        for token in tokens:
            if token.type.endswith("_open"):
                # 开始标签：创建节点并入栈
                node = self._create_node_from_token(token, slug_counter)
                if node:
                    stack[-1]["children"].append(node)
                    if token.nesting == 1:  # 有子节点
                        stack.append(node)

            elif token.type.endswith("_close"):
                # 结束标签：出栈
                if token.nesting == -1 and len(stack) > 1:
                    stack.pop()

            elif token.type == "inline":
                # 行内内容：递归处理子 token（使用独立的栈）
                if token.children:
                    inline_ast = self._process_inline_tokens(
                        token.children, slug_counter
                    )
                    stack[-1]["children"].extend(inline_ast)
            else:
                # 自闭合标签：直接添加
                node = self._create_node_from_token(token, slug_counter)
                if node:
                    stack[-1]["children"].append(node)

        # 后处理：为标题生成 ID
        ast["children"] = self._add_heading_ids(ast["children"], slug_counter)

        return ast

    def _process_inline_tokens(
        self, tokens: List, slug_counter: Dict[str, int]
    ) -> List[Dict[str, Any]]:
        """处理行内 tokens（独立的栈处理）

        Args:
            tokens: 行内 token 列表
            slug_counter: slug 计数器

        Returns:
            AST 节点列表
        """
        result: List[Dict[str, Any]] = []
        stack: List[Dict[str, Any]] = []  # 用于处理嵌套的行内元素

        for token in tokens:
            if token.type.endswith("_open"):
                # 开始标签：创建节点并入栈
                node = self._create_node_from_token(token, slug_counter)
                if node:
                    if not stack:
                        # 如果栈为空，添加到结果
                        result.append(node)
                    else:
                        # 否则添加到栈顶节点的 children
                        stack[-1]["children"].append(node)

                    if token.nesting == 1:  # 有子节点
                        stack.append(node)

            elif token.type.endswith("_close"):
                # 结束标签：出栈
                if token.nesting == -1 and stack:
                    stack.pop()

            else:
                # 文本或自闭合标签
                node = self._create_node_from_token(token, slug_counter)
                if node:
                    if not stack:
                        result.append(node)
                    else:
                        stack[-1]["children"].append(node)

        # 后处理：合并数学公式节点
        result = self._merge_math_nodes(result)

        # 后处理：为标题生成 ID
        result = self._add_heading_ids(result, slug_counter)

        return result

    def _merge_math_nodes(self, nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """合并数学公式节点

        将 <span class="math-inline"> + text + </span> 合并为一个 math 节点

        Args:
            nodes: 节点列表

        Returns:
            合并后的节点列表
        """
        result = []
        i = 0
        while i < len(nodes):
            node = nodes[i]

            # 检测数学公式模式：math(inline, children=[]) + text + ...
            if (
                node.get("type") == "math"
                and node.get("display") == "inline"
                and "children" in node
                and i + 1 < len(nodes)
            ):
                # 下一个节点应该是文本
                next_node = nodes[i + 1]
                if next_node.get("type") == "text":
                    # 合并为一个 math 节点
                    result.append(
                        {
                            "type": "math",
                            "display": "inline",
                            "value": next_node["value"],
                        }
                    )
                    i += 2  # 跳过下一个节点
                    continue

            result.append(node)
            i += 1

        return result

    def _add_heading_ids(
        self, nodes: List[Dict[str, Any]], slug_counter: Dict[str, int]
    ) -> List[Dict[str, Any]]:
        """为标题节点添加 ID

        递归遍历所有节点，为标题生成唯一的 ID（与 TOC 使用相同的算法）

        Args:
            nodes: 节点列表
            slug_counter: slug 计数器

        Returns:
            处理后的节点列表
        """
        for node in nodes:
            if node.get("type") == "heading" and node.get("_needs_id"):
                # 提取标题文本
                title = self._extract_text_from_node(node)
                # 生成唯一 slug
                slug = self._generate_unique_slug(title, slug_counter)
                node["id"] = slug
                # 移除临时标记
                del node["_needs_id"]

            # 递归处理子节点
            if "children" in node:
                self._add_heading_ids(node["children"], slug_counter)

        return nodes

    def _extract_text_from_node(self, node: Dict[str, Any]) -> str:
        """从节点中提取纯文本

        Args:
            node: AST 节点

        Returns:
            提取的文本
        """
        if node.get("type") == "text":
            return node.get("value", "")

        if "children" in node:
            return "".join(
                self._extract_text_from_node(child) for child in node["children"]
            )

        return ""

    def _generate_unique_slug(self, title: str, slug_counter: Dict[str, int]) -> str:
        """生成唯一 slug（与 TOC 生成逻辑保持一致）

        Args:
            title: 标题文本
            slug_counter: slug 计数器

        Returns:
            唯一的 slug
        """
        import re

        base_slug = re.sub(r"[^\w\s-]", "", title).strip().lower().replace(" ", "-")
        base_slug = re.sub(r"-+", "-", base_slug).strip("-")

        if not base_slug:
            base_slug = "heading"

        if base_slug not in slug_counter:
            slug_counter[base_slug] = 1
            return base_slug
        else:
            count = slug_counter[base_slug]
            slug_counter[base_slug] += 1
            return f"{base_slug}-{count}"

    def _create_node_from_token(
        self, token, slug_counter: Dict[str, int]
    ) -> Optional[Dict[str, Any]]:
        """从 token 创建 AST 节点

        Args:
            token: markdown-it token
            slug_counter: 标题 slug 计数器（用于生成唯一 ID）

        Returns:
            AST 节点字典，如果不需要创建节点则返回 None
        """
        token_type = token.type

        # 文本节点
        if token_type == "text":
            return {"type": "text", "value": token.content}

        # 代码文本（行内代码）
        if token_type == "code_inline":
            return {"type": "code_inline", "value": token.content}

        # 代码块
        if token_type == "fence" or token_type == "code_block":
            lang = token.info.strip() if token.info else None
            # 检测 Mermaid 图表
            if lang == "mermaid":
                return {"type": "mermaid", "value": token.content}
            return {"type": "code", "lang": lang, "value": token.content}

        # 标题
        if token_type == "heading_open":
            level = int(token.tag[1])  # h1 -> 1, h2 -> 2, ...
            # 标题 ID 将在处理完子节点后生成
            return {
                "type": "heading",
                "level": level,
                "children": [],
                "_needs_id": True,  # 标记需要生成 ID
            }

        # 段落
        if token_type == "paragraph_open":
            return {"type": "paragraph", "children": []}

        # 列表
        if token_type == "bullet_list_open":
            return {"type": "list", "ordered": False, "children": []}

        if token_type == "ordered_list_open":
            return {"type": "list", "ordered": True, "children": []}

        # 列表项
        if token_type == "list_item_open":
            return {"type": "list-item", "children": []}

        # 链接
        if token_type == "link_open":
            href = token.attrGet("href") if hasattr(token, "attrGet") else ""
            title = token.attrGet("title") if hasattr(token, "attrGet") else None
            return {"type": "link", "href": href or "", "title": title, "children": []}

        # 图片
        if token_type == "image":
            src = token.attrGet("src") if hasattr(token, "attrGet") else ""
            alt = token.content or ""
            title = token.attrGet("title") if hasattr(token, "attrGet") else None
            return {"type": "image", "src": src or "", "alt": alt, "title": title}

        # 引用块
        if token_type == "blockquote_open":
            return {"type": "blockquote", "children": []}

        # 强调（粗体）
        if token_type == "strong_open":
            return {"type": "strong", "children": []}

        # 斜体
        if token_type == "em_open":
            return {"type": "emphasis", "children": []}

        # 删除线
        if token_type == "s_open":
            return {"type": "strikethrough", "children": []}

        # 硬换行
        if token_type == "hardbreak":
            return {"type": "break"}

        # 软换行
        if token_type == "softbreak":
            return {"type": "text", "value": "\n"}

        # HTML 块（可能包含自定义组件或数学公式）
        if token_type == "html_block" or token_type == "html_inline":
            content = token.content

            # 检测数学公式（块级）
            if 'class="math-block"' in content:
                # 提取 LaTeX
                latex = re.search(
                    r'<div class="math-block">(.*?)</div>', content, re.DOTALL
                )
                if latex:
                    return {
                        "type": "math",
                        "display": "block",
                        "value": latex.group(1).strip(),
                    }

            # 检测数学公式（行内）- 开始标签
            if content == '<span class="math-inline">':
                # 这是数学公式的开始标签，创建一个 math 节点
                return {"type": "math", "display": "inline", "children": []}

            # 检测数学公式（行内）- 结束标签
            if content == "</span>":
                # 这是结束标签，返回 None（会被忽略）
                return None

            # 检测数学公式（行内）- 完整标签
            if 'class="math-inline"' in content:
                # 提取 LaTeX
                latex = re.search(r'<span class="math-inline">(.*?)</span>', content)
                if latex:
                    return {
                        "type": "math",
                        "display": "inline",
                        "value": latex.group(1).strip(),
                    }

            # 检测 Mermaid 图表
            if 'class="mermaid"' in content:
                mermaid_code = re.search(
                    r'<div class="mermaid">\s*(.*?)\s*</div>', content, re.DOTALL
                )
                if mermaid_code:
                    return {"type": "mermaid", "value": mermaid_code.group(1).strip()}

            # 检测自定义组件
            if "data-component=" in content:
                # 提取组件类型和属性
                component_match = re.search(r'data-component="([^"]+)"', content)
                if component_match:
                    component_name = component_match.group(1)
                    # 提取 props（简化处理）
                    props = {}
                    return {
                        "type": "custom-component",
                        "name": component_name,
                        "props": props,
                    }

            # 其他 HTML：作为原生 HTML 节点保留
            # 这样前端可以决定如何渲染（例如使用 dangerouslySetInnerHTML）
            return {
                "type": "html",
                "value": content,
                "display": "block" if token_type == "html_block" else "inline",
            }

        # 表格相关
        if token_type == "table_open":
            return {"type": "table", "children": []}

        if token_type == "thead_open":
            return {"type": "table-head", "children": []}

        if token_type == "tbody_open":
            return {"type": "table-body", "children": []}

        if token_type == "tr_open":
            return {"type": "table-row", "children": []}

        if token_type == "th_open" or token_type == "td_open":
            return {"type": "table-cell", "children": []}

        # 水平线
        if token_type == "hr":
            return {"type": "hr"}

        # 忽略 _close 类型的 token（已经在主循环中处理）
        if token_type.endswith("_close"):
            return None

        # 未知类型，返回 None
        return None
