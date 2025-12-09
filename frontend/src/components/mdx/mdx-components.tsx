import type { ComponentType, ReactNode } from "react";
import { CodeBlock } from "./CodeBlock";

/**
 * 🎨 MDX 自定义组件映射
 *
 * 这里定义了 MDX 中各种 Markdown 元素对应的 React 组件
 * 可以自定义样式，让 MDX 内容与你的设计系统保持一致
 */
export const components: Record<
  string,
  ComponentType<{ children?: ReactNode }>
> = {
  // 解决 h1 没样式的问题
  h1: ({ children }) => (
    // 如果没有这个映射，它就是一个普通的裸 h1
    // 有了这个映射，它就变成了带 Tailwind 样式的漂亮标题
    <h1 className="text-foreground mt-8 mb-4 text-4xl font-bold tracking-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-foreground mt-8 mb-4 border-b pb-2 text-3xl font-bold tracking-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-foreground mt-6 mb-3 text-2xl font-semibold">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-foreground mt-4 mb-2 text-xl font-semibold">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-foreground mt-3 mb-2 text-lg font-semibold">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-foreground mt-2 mb-1 text-base font-semibold">
      {children}
    </h6>
  ),

  // 段落
  p: ({ children }) => (
    <p className="text-foreground/90 mb-4 leading-7">{children}</p>
  ),

  // 链接
  a: ({ children, ...props }) => (
    <a
      className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
      {...props}
    >
      {children}
    </a>
  ),

  // 列表
  ul: ({ children }) => (
    <ul className="text-foreground/90 mb-4 list-outside list-disc space-y-2 pl-6">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="text-foreground/90 mb-4 list-outside list-decimal space-y-2 pl-6">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="marker:text-muted-foreground leading-7">{children}</li>
  ),

  // 引用块
  blockquote: ({ children }) => (
    <blockquote className="border-primary/50 text-muted-foreground my-4 border-l-4 pl-4 italic">
      {children}
    </blockquote>
  ),

  // 代码 - 样式主要由 index.css 和 rehype-pretty-code 控制
  // 这里只保留最基础的透传，避免覆盖插件生成的属性
  code: ({ children, ...props }) => <code {...props}>{children}</code>,
  // pre: ({ children, ...props }) => <pre {...props}>{children}</pre>,
  pre: (props) => <CodeBlock {...props} />,

  // 分隔线
  hr: () => <hr className="border-border my-8" />,

  // 表格
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="border-border w-full border-collapse border">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-border bg-muted border px-4 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-border border px-4 py-2">{children}</td>
  ),

  // 图片
  img: (props) => (
    <img className="my-4 h-auto max-w-full rounded-lg" {...props} />
  ),
};
