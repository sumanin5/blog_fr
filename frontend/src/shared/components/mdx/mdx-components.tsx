/**
 * 🎨 MDX 自定义组件映射（统一版本）
 *
 * 这是整个 MDX 渲染系统的核心配置文件，负责将 Markdown 元素映射到自定义的 React 组件。
 *
 * 核心解决的问题:
 * 1. 🚫 HTML 嵌套违规：避免 <p> 内嵌 block 级元素（div、table 等）
 * 2. 🎨 样式统一性：所有元素使用一致的设计系统样式
 * 3. 🧩 组件可扩展：支持自定义 React 组件（如 MermaidChart）
 * 4. 📱 响应式设计：所有组件都支持移动端适配
 *
 * 技术亮点:
 * - 智能 block 级元素检测算法
 * - 条件段落渲染（<p> vs <div>）
 * - Tailwind CSS 设计系统集成
 * - React 组件树递归分析
 * - 无障碍访问支持（语义化标签）
 */
import { Children, isValidElement } from "react";
import type { FC, ImgHTMLAttributes, ReactNode } from "react";
import { ImageIcon } from "lucide-react";

import { CodeBlock } from "./CodeBlock";
import {
  SimpleFlowExample,
  SystemArchExample,
} from "@/features/mdx/components/FlowExamples";
import { TableOfContents } from "./TableOfContents";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

// MDX 组件的通用属性类型
interface MDXComponentProps {
  children?: ReactNode;
  [key: string]: unknown;
}

/* ========== 🖼️ 图片组件定义 ========== */
/**
 * 语义化图片组件
 *
 * 使用 HTML5 的 <figure> 和 <figcaption> 标签提供更好的语义化支持，
 * 同时确保图片被识别为 block 级元素，避免被错误地包装在 <p> 标签内。
 *
 * 特性:
 * - 🏷️ 自动生成图片标题（基于 alt 文本）
 * - 📐 响应式图片布局
 * - ♿ 无障碍访问支持
 * - 🎨 统一的视觉样式
 */
const Img: FC<ImgHTMLAttributes<HTMLImageElement>> = ({ alt, ...props }) => (
  <figure className="my-8">
    {/* 响应式图片：高度自适应，宽度填满容器 */}
    <img className="h-auto w-full object-cover" alt={alt} {...props} />
    {/* 条件渲染图片标题：只在有 alt 文本时显示 */}
    {alt && (
      <figcaption className="text-muted-foreground mt-2 flex items-center justify-center gap-1.5 text-center text-sm">
        <ImageIcon className="h-3 w-3" />
        {alt}
      </figcaption>
    )}
  </figure>
);

/* ========== 🔍 Block 级元素检测系统 ========== */
/**
 * HTML Block 级标签集合
 *
 * 这些标签在 HTML 规范中被定义为 block 级元素，不应该被包装在 <p> 标签内。
 * 如果 MDX 检测到段落内包含这些元素，会自动使用 <div> 替代 <p> 来避免 HTML 违规。
 */
const blockTags = new Set([
  "pre", // 预格式化文本（代码块）
  "table", // 表格
  "thead", // 表格头部
  "tbody", // 表格主体
  "tr", // 表格行
  "td", // 表格单元格
  "th", // 表格标题单元格
  "blockquote", // 引用块
  "ul", // 无序列表
  "ol", // 有序列表
  "li", // 列表项
  "figure", // 图片容器
  "div", // 通用容器
]);

/**
 * React 组件 Block 级检测集合
 *
 * 除了 HTML 标签，某些自定义 React 组件也应该被视为 block 级元素。
 */
const blockComponents = new Set<unknown>([
  CodeBlock, // 自定义代码块组件
  Img, // 自定义图片组件
]);

/**
 * 递归检测 React 节点是否包含 block 级子元素
 *
 * 这是核心算法，用于分析 React 组件树，判断是否存在不能放在 <p> 内的元素。
 *
 * @param children - React 子节点（可能是任意类型）
 * @returns boolean - 是否包含 block 级元素
 */
const hasBlockChild = (children: ReactNode) =>
  Children.toArray(children).some((child) => {
    // 非 React 元素（字符串、数字等）都不是 block 级
    if (!isValidElement(child)) return false;

    // 获取组件类型
    const type = child.type as unknown;

    // 检查 HTML 标签
    if (typeof type === "string") return blockTags.has(type);

    // 检查自定义组件
    return blockComponents.has(type);
  });

/* ========== 📝 核心组件映射表 ========== */
/**
 * MDX 组件映射配置
 *
 * 这个对象定义了 Markdown 元素到 React 组件的映射关系。
 * 每个 key 对应一个 HTML 标签或 Markdown 语法，value 是对应的 React 组件。
 */
export const components: Record<string, FC<MDXComponentProps>> = {
  /* ========== 📑 标题组件系列 ========== */
  // 渐进式标题层级，字体大小和间距递减
  h1: ({ children, ...props }) => (
    <h1
      className="text-foreground mt-10 mb-6 text-4xl font-extrabold tracking-tight lg:text-5xl"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="text-foreground mt-10 mb-4 border-b pb-2 text-3xl font-bold tracking-tight first:mt-0"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="text-foreground mt-8 mb-3 text-2xl font-semibold tracking-tight"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="text-foreground mt-6 mb-2 text-xl font-semibold tracking-tight"
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5
      className="text-foreground mt-4 mb-2 text-lg font-semibold tracking-tight"
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6
      className="text-foreground mt-4 mb-2 text-base font-semibold tracking-tight"
      {...props}
    >
      {children}
    </h6>
  ),

  /* ========== 📄 智能段落处理 ========== */
  /**
   * 段落组件的核心创新
   *
   * 这是整个系统最重要的组件之一。传统的 MDX 会将所有内容包装在 <p> 标签内，
   * 但这会导致 HTML 规范违规（<p> 不能包含 block 级元素如 <div>、<table> 等）。
   *
   * 解决方案：
   * 1. 检测段落内容是否包含 block 级子元素
   * 2. 如果包含，使用 <div> 替代 <p>
   * 3. 如果不包含，正常使用 <p>
   *
   * 这种智能切换确保了 HTML 的有效性和语义的正确性。
   */
  p: ({ children }) => {
    if (!children) return null; // 空段落直接返回 null

    // 核心判断：是否包含 block 级子元素
    if (hasBlockChild(children)) {
      // 包含 block 元素：使用 div 容器，添加垂直间距
      return (
        <div className="text-foreground/90 mb-5 space-y-4 leading-7">
          {children}
        </div>
      );
    }

    // 不包含 block 元素：正常使用 p 标签
    return <p className="text-foreground/90 mb-5 leading-7">{children}</p>;
  },

  /* ========== 🔗 链接和导航 ========== */
  // 链接
  a: ({ children, ...props }) => (
    <a
      className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 transition-colors"
      {...props}
    >
      {children}
    </a>
  ),

  /* ========== 📋 列表组件 ========== */
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

  /* ========== 💬 引用和强调 ========== */
  // 引用块
  blockquote: ({ children }) => (
    <blockquote className="border-primary bg-muted/30 my-6 border-l-4 p-4 italic">
      {children}
    </blockquote>
  ),

  /* ========== 💻 代码相关 ========== */
  // 行内代码 & 代码块
  code: ({ children, ...props }) => (
    <code
      className="bg-muted text-foreground relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
      {...props}
    >
      {children}
    </code>
  ),
  pre: (props) => <CodeBlock {...props} />, // 使用自定义代码块组件

  /* ========== ➖ 分隔符 ========== */
  // 分隔线
  hr: () => <hr className="border-border my-8" />,

  /* ========== 📊 表格组件系列 ========== */
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

  /* ========== 🖼️ 媒体组件 ========== */
  // 图片：使用 figure/figcaption，保持与 block 布局一致
  img: Img,

  /* ========== 🔄 自定义 React Flow 组件 ========== */
  // React Flow 组件
  SimpleFlowExample,
  SystemArchExample,

  /* ========== 📋 智能目录组件 ========== */
  // 自动目录生成组件 - 扫描页面标题并生成目录按钮
  // 使用方法：在MDX中直接写 <TableOfContents />
  TableOfContents: (props: MDXComponentProps) => (
    <TableOfContents
      className={props.className as string}
      contentSelector={props.contentSelector as string}
    />
  ),
};
