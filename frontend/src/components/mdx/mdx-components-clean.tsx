import { Children, isValidElement } from "react";
import type { FC, ImgHTMLAttributes, ReactNode } from "react";
import { ImageIcon } from "lucide-react";

import { CodeBlock } from "./CodeBlock";
import { SimpleFlowExample, SystemArchExample } from "./FlowExamples";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// MDX 组件的通用属性类型
interface MDXComponentProps {
  children?: ReactNode;
  [key: string]: unknown;
}

// 独立定义图片，便于识别为块级内容
const Img: FC<ImgHTMLAttributes<HTMLImageElement>> = ({ alt, ...props }) => (
  <figure className="my-8">
    <img className="h-auto w-full object-cover" alt={alt} {...props} />
    {alt && (
      <figcaption className="text-muted-foreground mt-2 flex items-center justify-center gap-1.5 text-center text-sm">
        <ImageIcon className="h-3 w-3" />
        {alt}
      </figcaption>
    )}
  </figure>
);

const blockTags = new Set([
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "blockquote",
  "ul",
  "ol",
  "li",
  "figure",
  "div",
]);

const blockComponents = new Set<unknown>([CodeBlock, Img]);

const hasBlockChild = (children: ReactNode) =>
  Children.toArray(children).some((child) => {
    if (!isValidElement(child)) return false;
    const type = child.type as unknown;
    if (typeof type === "string") return blockTags.has(type);
    return blockComponents.has(type);
  });

export const components: Record<string, FC<MDXComponentProps>> = {
  // 标题
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

  // 段落 - 避免在 <p> 内嵌 block 级元素
  p: ({ children }) => {
    if (!children) return null;
    if (hasBlockChild(children)) {
      return (
        <div className="text-foreground/90 mb-5 space-y-4 leading-7">
          {children}
        </div>
      );
    }
    return <p className="text-foreground/90 mb-5 leading-7">{children}</p>;
  },

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

  // 引用块
  blockquote: ({ children }) => (
    <blockquote className="border-primary bg-muted/30 my-6 border-l-4 p-4 italic">
      {children}
    </blockquote>
  ),

  // 行内代码 & 代码块
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

  // 表格
  table: ({ children }) => (
    <div className="border-border bg-card relative my-8 overflow-hidden rounded-xl border shadow-sm">
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
    <TableHead className="text-primary h-12 px-4 text-left align-middle font-bold">
      {children}
    </TableHead>
  ),
  td: ({ children }) => (
    <TableCell className="text-foreground/90 p-4 align-middle">
      {children}
    </TableCell>
  ),

  // 图片
  img: Img,

  // React Flow 组件
  SimpleFlowExample,
  SystemArchExample,
};
