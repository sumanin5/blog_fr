// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  escapeHtml,
  readerBody,
  renderMarkdownHtml,
  renderReaderIndexHtml,
  renderReaderPartHtml,
  splitMarkdownParts,
  type ReaderMeta,
} from "./reader";

const meta: ReaderMeta = {
  title: "测试文章",
  description: "一段简介",
  published: "2026-11-10T14:49:37",
  category: "三十题记",
  tags: ["测试"],
  canonicalUrl: "https://example.com/posts/ideas/demo",
  markdownUrl: "https://example.com/posts/ideas/demo.md",
  textUrl: "https://example.com/posts/ideas/demo.txt",
  readerUrl: "https://example.com/posts/ideas/demo/read",
};

describe("readerBody", () => {
  it("removes frontmatter, MDX imports and the duplicate leading H1", () => {
    const source = [
      "---",
      "title: 标题",
      "---",
      "# 标题",
      "",
      'import { Chart } from "./chart";',
      "",
      "正文第一段。",
    ].join("\n");

    expect(readerBody(source)).toBe("正文第一段。");
  });

  it("removes embedded style and script blocks from the reader output", () => {
    const source = [
      "# 标题",
      "",
      "<style>img { width: 100%; }</style>",
      "",
      "<script>alert(1)</script>",
      "",
      "正文。",
    ].join("\n");

    expect(readerBody(source)).toBe("正文。");
  });
});

describe("splitMarkdownParts", () => {
  it("splits at H2 headings and keeps the intro", () => {
    const source = [
      "# 总标题",
      "",
      "开篇介绍。",
      "",
      "## 第一节",
      "",
      "第一节正文。",
      "",
      "## 第二节",
      "",
      "第二节正文。",
    ].join("\n");

    const parts = splitMarkdownParts(source);
    expect(parts.map((part) => part.title)).toEqual(["开篇", "第一节", "第二节"]);
    expect(parts.map((part) => part.markdown)).toEqual([
      "开篇介绍。",
      "## 第一节\n\n第一节正文。",
      "## 第二节\n\n第二节正文。",
    ]);
  });

  it("does not treat H2 inside a code fence as a section boundary", () => {
    const source = [
      "## 代码",
      "",
      "```md",
      "## 这不是标题",
      "",
      "```",
      "",
      "代码之后。",
    ].join("\n");

    const parts = splitMarkdownParts(source);
    expect(parts).toHaveLength(1);
    expect(parts[0].markdown).toContain("## 这不是标题");
  });

  it("chunks long sections and repeats a continuation heading", () => {
    const paragraphs = Array.from(
      { length: 6 },
      (_, index) => `第 ${index + 1} 段正文。`.repeat(20),
    );
    const source = `## 长章节\n\n${paragraphs.join("\n\n")}`;
    const parts = splitMarkdownParts(source, 500);

    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0].markdown.startsWith("## 长章节")).toBe(true);
    expect(parts[1].markdown.startsWith("## 长章节（续）")).toBe(true);
    for (const part of parts) {
      // 续段标题会让长度略微超过限制，但不能明显超出
      expect(part.markdown.length).toBeLessThanOrEqual(540);
    }
  });
});

describe("reader html", () => {
  it("escapes user-facing text", () => {
    expect(escapeHtml('<a href="x">&')).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;",
    );
  });

  it("turns relative links and images into absolute URLs", () => {
    const html = renderMarkdownHtml(
      "![图](./cover.png)\n\n[链接](../other)",
      "https://example.com/posts/ideas/demo",
    );

    expect(html).toContain('src="https://example.com/posts/ideas/cover.png"');
    expect(html).toContain('href="https://example.com/posts/other"');
  });

  it("renders an index with every part link", () => {
    const parts = splitMarkdownParts("## 一\n\n甲\n\n## 二\n\n乙");
    const html = renderReaderIndexHtml(meta, parts);

    expect(html).toContain("分段阅读（共 2 段）");
    expect(html).toContain('href="/posts/ideas/demo/read/1"');
    expect(html).toContain('href="/posts/ideas/demo/read/2"');
    expect(html).toContain("text/markdown");
    expect(html).toContain("text/plain");
  });

  it("renders prev/next links for a part page", () => {
    const parts = splitMarkdownParts("## 一\n\n甲\n\n## 二\n\n乙");
    const html = renderReaderPartHtml(meta, parts, parts[1]);

    expect(html).toContain("第 2 / 2 段");
    expect(html).toContain('rel="prev"');
    expect(html).toContain('href="/posts/ideas/demo/read/1"');
    expect(html).not.toContain('rel="next"');
  });
});
