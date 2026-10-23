import Image from "next/image";
import React from "react";
import type { MarkdownDocument } from "@tanstack/markdown";
import { Markdown, type MarkdownComponents } from "@tanstack/markdown/react";

import { MermaidDiagram } from "@/components/public/mdx/components/mermaid-diagram";
import { CopyButton } from "@/components/public/mdx/utils/copy-button";
import { cn } from "@/lib/utils";
import {
  highlightMarkdownCode,
  normalizeCodeLanguage,
} from "@/lib/markdown/highlight";

interface TanStackMarkdownRendererProps {
  document: MarkdownDocument;
  articleClassName?: string;
}

type MarkdownPreProps = React.ComponentPropsWithoutRef<"pre"> & {
  "data-lang"?: string;
  "data-meta"?: string;
  "data-code-title"?: string;
  "data-filename"?: string;
};

function extractCodeElement(children: React.ReactNode) {
  const child = React.Children.toArray(children).find(React.isValidElement) as
    | React.ReactElement<{
        children?: React.ReactNode;
        className?: string;
      }>
    | undefined;

  return {
    code:
      typeof child?.props.children === "string" ? child.props.children : "",
    className: child?.props.className ?? "",
  };
}

/**
 * TanStack Markdown 负责 pre/code 容器，这里只接管：
 * - 代码高亮（TanStack Highlight）
 * - Mermaid 分支
 * - 代码块工具栏与复制
 */
function MarkdownPre({
  children,
  className,
  "data-lang": dataLang,
  "data-filename": filename,
  ...props
}: MarkdownPreProps) {
  const { code, className: codeClassName } = extractCodeElement(children);
  const language = normalizeCodeLanguage(
    dataLang || codeClassName.replace("language-", ""),
  );
  const languageLabel = language === "plaintext" ? "text" : language;

  if (!code) {
    return (
      <pre className={className} {...props}>
        {children}
      </pre>
    );
  }

  if (language === "mermaid") {
    return <MermaidDiagram code={code} />;
  }

  let highlighted: string | null = null;
  try {
    highlighted = highlightMarkdownCode(code, language);
  } catch (error) {
    console.error("TanStack Highlight error:", error);
  }

  return (
    <div className="group my-6 overflow-hidden rounded-xl border border-border/70 bg-muted/25">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/40 px-4 py-2">
        <span className="truncate font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {filename || languageLabel}
        </span>
        <CopyButton code={code} />
      </div>

      <pre
        className="tm-code overflow-x-auto p-4 text-[13px] leading-7"
        data-lang={language}
      >
        {highlighted ? (
          <code
            className={cn(
              "language-" + language,
              "bg-transparent p-0 text-inherit",
            )}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <code className={cn("language-" + language, "bg-transparent p-0")}>
            {code}
          </code>
        )}
      </pre>
    </div>
  );
}

function MarkdownImage({
  src,
  alt,
  title,
  width,
  height,
}: React.ComponentPropsWithoutRef<"img">) {
  if (!src) return null;

  return (
    <Image
      src={String(src)}
      alt={alt || ""}
      title={title}
      width={Number(width) || 1200}
      height={Number(height) || 800}
      unoptimized
      className="mx-auto h-auto max-w-full rounded-lg border border-border/50 shadow-sm"
    />
  );
}

function MarkdownLink({
  href,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"a">) {
  const external = Boolean(href && /^https?:\/\//i.test(href));

  return (
    <a
      {...props}
      href={href}
      {...(external
        ? { target: "_blank", rel: "nofollow noopener noreferrer" }
        : {})}
    >
      {children}
    </a>
  );
}

const markdownComponents: MarkdownComponents = {
  pre: MarkdownPre,
  img: MarkdownImage,
  a: MarkdownLink,
  table: (props) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-border/60">
      <table className="my-0" {...props} />
    </div>
  ),
  h1: (props) => <h1 className="scroll-mt-28" {...props} />,
  h2: (props) => <h2 className="scroll-mt-28" {...props} />,
  h3: (props) => <h3 className="scroll-mt-28" {...props} />,
  h4: (props) => <h4 className="scroll-mt-28" {...props} />,
  h5: (props) => <h5 className="scroll-mt-28" {...props} />,
  h6: (props) => <h6 className="scroll-mt-28" {...props} />,
};

export function TanStackMarkdownRenderer({
  document,
  articleClassName,
}: TanStackMarkdownRendererProps) {
  return (
    <article className={cn(articleClassName, "markdown-body")}>
      <Markdown
        components={markdownComponents}
        allowHtml
        headingAnchors={{
          content: "#",
          className: "heading-anchor",
          ariaHidden: true,
          tabIndex: -1,
        }}
      >
        {document}
      </Markdown>
    </article>
  );
}
