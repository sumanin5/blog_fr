/**
 * MDX 自定义组件映射
 *
 * 目的：为 MDX 内容提供统一的组件渲染规则
 * 适用场景：
 *   1. 服务端渲染 (next-mdx-remote/rsc)
 *   2. 客户端渲染 (next-mdx-remote)
 *
 * 架构说明：
 *   - 静态组件（如代码高亮）尽量在服务端完成
 *   - 交互组件（如复制按钮）标记为 "use client"
 */

import { MermaidDiagram } from "./mermaid-diagram";
import { CodeBlock } from "./code-block";
import { InteractiveButton } from "./interactive-button";

/**
 * MDX 组件类型定义
 */
type ComponentProps = Record<string, any>;

/**
 * 通用 MDX 组件配置
 * 可在服务端和客户端环境中复用
 */
export const mdxComponents: Record<
  string,
  React.ComponentType<ComponentProps>
> = {
  // 代码块处理：识别 Mermaid 图表和普通代码
  pre: (props: any) => {
    const children = props.children;
    if (children?.type === "code") {
      const code = children.props.children;
      const className = children.props.className || "";
      const lang = className.replace("language-", "");

      // Mermaid 图表渲染（客户端组件）
      if (lang === "mermaid") {
        return <MermaidDiagram code={code} />;
      }

      // 普通代码块渲染（支持语法高亮 + 复制按钮）
      return <CodeBlock code={code} className={className} />;
    }
    return <pre {...props} />;
  },

  // 交互式按钮组件（客户端组件，支持 onClick 等事件）
  InteractiveButton,
};
