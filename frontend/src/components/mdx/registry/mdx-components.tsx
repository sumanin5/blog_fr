/**
 * MDX 组件注册中心
 *
 * 职责：只做组件映射，不包含业务逻辑
 *
 * 架构原则：
 * - 注册层只负责路由（哪个标签用哪个组件）
 * - 业务逻辑在组件内部处理
 * - 保持注册层简洁清晰
 */

import React from "react";
import { CodeBlock } from "../components/code-block";
import { InteractiveButton } from "../components/interactive-button";

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  id?: string;
  children?: React.ReactNode;
};

interface TocItem {
  id: string;
  title: string;
  level: number;
}

/**
 * 从 React 节点中提取纯文本
 */
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.props?.children) {
      return extractText(element.props.children);
    }
  }
  return "";
}

/**
 * 转换 HTML style 字符串为 React style 对象
 */
function parseStyleString(styleStr: string): React.CSSProperties {
  const style: Record<string, string> = {};
  styleStr.split(";").forEach((rule) => {
    const [key, value] = rule.split(":").map((s) => s.trim());
    if (key && value) {
      // 转换 kebab-case 为 camelCase
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      style[camelKey] = value;
    }
  });
  return style as React.CSSProperties;
}

/**
 * 创建支持 HTML style 属性的 HTML 元素组件
 */
function createHtmlElement(tag: string) {
  return function HtmlElement(
    props: React.HTMLAttributes<HTMLElement> & {
      style?: string | React.CSSProperties;
    }
  ) {
    const { style, ...rest } = props;

    // 如果 style 是字符串，转换为对象
    const styleObj =
      typeof style === "string" ? parseStyleString(style) : style;

    return React.createElement(tag, { ...rest, style: styleObj });
  };
}

/**
 * 创建 MDX 组件映射
 *
 * @param toc - 后端生成的目录数组
 */
export function createMdxComponents(
  toc: TocItem[] = []
): Record<string, React.ComponentType> {
  // 创建标题组件工厂
  const createHeading = (tag: string, level: number) => {
    return function Heading(props: HeadingProps) {
      // 提取标题文本
      const text = extractText(props.children);

      // 从 toc 中查找匹配的 ID
      const tocItem = toc.find(
        (item) => item.level === level && item.title === text
      );
      const id = props.id || tocItem?.id || "";

      return React.createElement(
        tag,
        {
          ...props,
          id,
          className: ["scroll-mt-24", props.className]
            .filter(Boolean)
            .join(" "),
        },
        props.children
      );
    };
  };

  return {
    // 代码块：直接映射到 CodeBlock（内部处理 Mermaid 判断）
    pre: CodeBlock,

    // 标题：从 toc 中匹配 ID
    h1: createHeading("h1", 1),
    h2: createHeading("h2", 2),
    h3: createHeading("h3", 3),
    h4: createHeading("h4", 4),
    h5: createHeading("h5", 5),
    h6: createHeading("h6", 6),

    // HTML 元素：支持字符串格式的 style 属性
    div: createHtmlElement("div"),
    span: createHtmlElement("span"),
    p: createHtmlElement("p"),
    section: createHtmlElement("section"),
    article: createHtmlElement("article"),

    // 自定义组件
    InteractiveButton: InteractiveButton as React.ComponentType,
  };
}
