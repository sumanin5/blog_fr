import type { ReactNode, ImgHTMLAttributes, FC } from "react";
import { CodeBlock } from "./CodeBlock";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Quote, ImageIcon } from "lucide-react";

/**
 * 🎨 MDX 自定义组件映射
 *
 * 这里定义了 MDX 中各种 Markdown 元素对应的 React 组件
 * 可以自定义样式，让 MDX 内容与你的设计系统保持一致
 */

// MDX 组件的通用属性类型
interface MDXComponentProps {
  children?: ReactNode;
  [key: string]: unknown;
}

export const components: Record<string, FC<MDXComponentProps>> = {
  // 解决 h1 没样式的问题
  h1: ({ children }) => (
    <h1 className="text-foreground mt-10 mb-6 text-4xl font-extrabold tracking-tight lg:text-5xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-foreground mt-10 mb-4 border-b pb-2 text-3xl font-bold tracking-tight first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-foreground mt-8 mb-3 text-2xl font-semibold tracking-tight">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-foreground mt-6 mb-2 text-xl font-semibold tracking-tight">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-foreground mt-4 mb-2 text-lg font-semibold tracking-tight">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-foreground mt-4 mb-2 text-base font-semibold tracking-tight">
      {children}
    </h6>
  ),

  // 段落
  p: ({ children }) => (
    <p className="text-foreground/90 mb-5 leading-7 [&:not(:first-child)]:mt-5">
      {children}
    </p>
  ),

  // 链接
  a: ({ children, ...props }) => (
    <a
      className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 transition-colors"
      {...props}
    >
      {children}
    </a>
  ),

  // 列表
  ul: ({ children }) => (
    <ul className="text-foreground/90 mb-5 list-outside list-disc space-y-2 pl-6">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="text-foreground/90 mb-5 list-outside list-decimal space-y-2 pl-6">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="marker:text-muted-foreground pl-1 leading-7">{children}</li>
  ),

  // 引用块 -> 使用 Card 组件，设计成酷炫的提示块
  blockquote: ({ children }) => (
    <Card className="border-l-primary bg-muted/30 hover:bg-muted/40 hover:border-l-primary/80 my-6 border-l-4 shadow-sm transition-all duration-500 ease-out hover:-translate-x-1 hover:shadow-lg">
      <CardContent className="flex gap-4 p-4 pt-4">
        <Quote className="text-primary/40 h-8 w-8 flex-shrink-0 rotate-180 transition-transform duration-500 hover:scale-110" />
        <div className="text-muted-foreground leading-relaxed italic">
          {children}
        </div>
      </CardContent>
    </Card>
  ),

  // 代码 - 样式主要由 index.css 和 rehype-pretty-code 控制
  code: ({ children, ...props }) => (
    <code
      className="bg-muted text-foreground relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
      {...props}
    >
      {children}
    </code>
  ),
  pre: (props) => <CodeBlock {...props} />,

  // 分隔线
  hr: () => <hr className="border-border my-8" />,

  // ========== 表格（使用 shadcn Table，酷炫风格） ==========
  table: ({ children }) => (
    <div className="border-border bg-card relative my-8 overflow-hidden rounded-xl border shadow-[0_0_15px_rgba(0,0,0,0.05)] transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.02)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]">
      {/* 顶部装饰条 */}
      <div className="via-primary/50 absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent to-transparent opacity-50" />
      <div className="overflow-x-auto">
        <Table className="w-full">{children}</Table>
      </div>
    </div>
  ),
  thead: ({ children }) => (
    <TableHeader className="bg-muted/50">{children}</TableHeader>
  ),
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => (
    <TableRow className="hover:bg-muted/30 border-border/50 border-b transition-colors last:border-0">
      {children}
    </TableRow>
  ),
  th: ({ children }) => (
    <TableHead className="text-primary h-12 px-4 text-left align-middle font-bold [&:has([role=checkbox])]:pr-0">
      {children}
    </TableHead>
  ),
  td: ({ children }) => (
    <TableCell className="text-foreground/90 p-4 align-middle [&:has([role=checkbox])]:pr-0">
      {children}
    </TableCell>
  ),

  // 图片 -> 增加卡片式外框和阴影
  img: ({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => (
    <div className="group my-8">
      <div className="border-border bg-muted/20 hover:border-primary/30 relative overflow-hidden rounded-xl border shadow-sm transition-all duration-300 hover:shadow-lg">
        <img
          className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          alt={alt}
          {...props}
        />
      </div>
      {alt && (
        <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1.5 text-center text-sm">
          <ImageIcon className="h-3 w-3" />
          {alt}
        </p>
      )}
    </div>
  ),
};
