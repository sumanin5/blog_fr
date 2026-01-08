import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypePrism from "rehype-prism-plus";
import rehypeSlug from "rehype-slug";

/**
 * Vite 配置文件 - 使用 PrismJS 进行代码高亮
 *
 * 插件说明：
 * - react(): React 支持（JSX 转换等）
 * - tailwindcss(): Tailwind CSS 支持
 * - mdx(): MDX 支持（在 Markdown 中使用 React 组件）
 *
 * MDX 插件配置：
 * - remarkGfm: GitHub Flavored Markdown（表格、删除线、任务列表等）
 * - remarkMath: 数学公式语法支持（$...$ 和 $$...$$）
 * - rehypeKatex: 将数学公式渲染为 KaTeX
 * - rehypePrism: 代码语法高亮（PrismJS）
 */
export default defineConfig({
  plugins: [
    tanstackRouter(),
    // MDX 插件必须在 React 插件之前
    mdx({
      providerImportSource: "@mdx-js/react",
      // remark 插件：处理 Markdown 扩展语法
      remarkPlugins: [remarkGfm, remarkMath],
      // rehype 插件：处理 HTML 转换
      rehypePlugins: [
        rehypeSlug, // 自动为标题生成 ID
        rehypeKatex,
        [rehypePrism, { showLineNumbers: true }], // PrismJS 高亮 + 行号
      ],
    }),
    react({
      // 排除 MDX 文件，让 MDX 插件处理
      exclude: /\.mdx$/,
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
});
