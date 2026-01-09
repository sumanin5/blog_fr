"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface PostContentProps {
  html: string;
  className?: string;
}

export function PostContent({ html, className = "" }: PostContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let isCancelled = false; // 用于标记当前 Effect 是否已失效

    // 使用防抖 (Debounce) 解决 "系统主题" 模式下的快速重渲染竞态问题
    const timer = setTimeout(() => {
      // 如果在等待期间 Effect 被清理了，根据闭包特性，isCancelled 可能会被 cleanup 置为 true
      // 但更安全的是在 cleanup 里清除 timer。这里双重保险。
      if (isCancelled) return;

      const initContent = async () => {
        // 任何一步 await 之后都要检查 isCancelled，防止在组件卸载后继续执行操作
        if (!contentRef.current || isCancelled) return;

        // 1. KaTeX - Render math formulas
        const mathElements = contentRef.current.querySelectorAll(
          ".math-inline, .math-block"
        );
        if (mathElements.length > 0) {
          try {
            const katex = (await import("katex")).default;
            if (isCancelled) return; // Async guard

            mathElements.forEach((el) => {
              if (el.querySelector(".katex")) return;
              const latex = el.textContent || "";
              const isBlock = el.classList.contains("math-block");
              try {
                katex.render(latex, el as HTMLElement, {
                  displayMode: isBlock,
                  throwOnError: false,
                });
              } catch (e) {
                console.error("KaTeX render error:", e);
              }
            });
          } catch (e) {
            console.error("KaTeX load error:", e);
          }
        }

        // 2. Mermaid - Render diagrams
        // 这一步最容易受竞态影响，必须严格检查
        if (isCancelled) return;
        const mermaidElements = contentRef.current.querySelectorAll(".mermaid");
        if (mermaidElements.length > 0) {
          try {
            const mermaid = (await import("mermaid")).default;
            if (isCancelled) return; // Async guard

            mermaid.initialize({
              startOnLoad: false,
              theme: resolvedTheme === "dark" ? "dark" : "default",
              themeVariables: {
                darkMode: resolvedTheme === "dark",
              },
              suppressErrorRendering: true, // 恢复错误抑制，避免页面出现红框干扰用户体验
            });

            const nodesToRender: HTMLElement[] = [];

            mermaidElements.forEach((el) => {
              const element = el as HTMLElement;

              // [核心修复] 源码一致性还原
              // 获取或备份原始代码
              let originalCode = element.getAttribute("data-original-code");
              if (!originalCode) {
                if (element.textContent) {
                  originalCode = element.textContent;
                  element.setAttribute("data-original-code", originalCode);
                }
              }

              // 强制用原始代码覆盖内容 (这会清除任何 SVG 或 插件注入的 HTML)
              if (originalCode) {
                element.textContent = originalCode;
              }
              element.removeAttribute("data-processed");
              nodesToRender.push(element);
            });

            if (nodesToRender.length > 0) {
              await mermaid.run({
                nodes: nodesToRender,
              });
            }
          } catch (e) {
            // 即便出错，也只在开发环境打印，且只打印非空错误
            if (process.env.NODE_ENV === "development" && !isCancelled) {
              const err = e as { message?: string; str?: string };
              // 进一步减少噪音：这里的错误通常是 "element not found" (因为被卸载) 或者解析错误
              // 如果是解析错误，suppressErrorRendering 已经处理了 UI
              // 我们只 log 极其严重的
            }
          }
        }

        // 3. Highlight.js - Syntax highlighting
        if (isCancelled) return;
        const codeBlocks = contentRef.current.querySelectorAll(
          "pre code[class*='language-']"
        );
        if (codeBlocks.length > 0) {
          try {
            const hljs = (await import("highlight.js")).default;
            if (isCancelled) return; // Async guard

            codeBlocks.forEach((block) => {
              const element = block as HTMLElement;
              // 增强的高亮检查：必须同时拥有类名和 span 标签
              const hasHighlightTags = element.querySelector("span") !== null;
              if (element.classList.contains("hljs") && hasHighlightTags)
                return;

              element.classList.remove("hljs");
              hljs.highlightElement(element);
            });
          } catch (e) {
            console.error("Highlight load error:", e);
          }
        }
      };

      initContent();
    }, 100);

    return () => {
      isCancelled = true; // 标记该次 Effect 已作废
      clearTimeout(timer);
    };
  }, [html, resolvedTheme]);

  return (
    <article
      ref={contentRef}
      className={`
        prose prose-lg dark:prose-invert max-w-none
        prose-headings:scroll-mt-20
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-code:before:content-none prose-code:after:content-none
        prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
        prose-img:rounded-lg prose-img:shadow-md
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
