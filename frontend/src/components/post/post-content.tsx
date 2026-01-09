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
    const initContent = async () => {
      if (!contentRef.current) return;

      // 1. KaTeX - Render math formulas
      const mathElements = contentRef.current.querySelectorAll(
        ".math-inline, .math-block"
      );
      if (mathElements.length > 0) {
        const katex = (await import("katex")).default;

        mathElements.forEach((el) => {
          // Skip if already rendered
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
      }

      // 2. Mermaid - Render diagrams
      const mermaidElements = contentRef.current.querySelectorAll(".mermaid");
      if (mermaidElements.length > 0) {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === "dark" ? "dark" : "default",
          themeVariables: {
            darkMode: resolvedTheme === "dark",
          },
        });

        // Clear previous renders
        mermaidElements.forEach((el) => {
          const svg = el.querySelector("svg");
          if (svg) svg.remove();
        });

        // Re-render
        try {
          await mermaid.run({
            nodes: Array.from(mermaidElements) as HTMLElement[],
          });
        } catch (e) {
          console.error("Mermaid render error:", e);
        }
      }

      // 3. Highlight.js - Syntax highlighting
      const codeBlocks = contentRef.current.querySelectorAll(
        "pre code[class*='language-']"
      );
      if (codeBlocks.length > 0) {
        const hljs = (await import("highlight.js")).default;

        codeBlocks.forEach((block) => {
          // Skip if already highlighted
          if (block.classList.contains("hljs")) return;
          hljs.highlightElement(block as HTMLElement);
        });
      }
    };

    initContent();
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
