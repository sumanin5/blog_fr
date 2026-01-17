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

type ComponentProps = Record<string, unknown>;

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
    const element = node as React.ReactElement<any>;
    if (element.props?.children) {
      return extractText(element.props.children);
    }
  }
  return "";
}

/**
 * 创建 MDX 组件映射
 *
 * @param toc - 后端生成的目录数组
 */
export function createMdxComponents(toc: TocItem[] = []): Record<string, any> {
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

    // 自定义组件
    InteractiveButton: InteractiveButton as any,
  };
}
