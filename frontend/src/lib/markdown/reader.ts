/**
 * AI 友好的分段阅读输出。
 *
 * 一些网页抓取工具只接受 text/html，并且会在约 5000 字符处硬截断。
 * 单篇文档再干净也可能被截断，所以这里把正文拆成多个纯内容 HTML 页面：
 * - 每段只包含正文，不含站点导航、侧栏和页脚
 * - 每段默认不超过 READER_MAX_PART_CHARS 个字符
 * - 每段都有上一段 / 下一段 / 目录链接，便于顺序抓取
 */

import { renderHtml } from "@tanstack/markdown";
import { docsMarkdownExtensions } from "@tanstack/markdown/extensions/docs";

import { siteConfig } from "@/config/site";
import { toPortableMarkdown } from "./export";
import { stripLeadingMarkdownHeading } from "./leading-heading";

export const READER_MAX_PART_CHARS = 1000;

const FENCE = /^\s*(```|~~~)/;
const FRONTMATTER = /^\uFEFF?\s*---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export interface ReaderPart {
  /** 从 1 开始，直接用于 /read/:part */
  index: number;
  title: string;
  markdown: string;
}

export interface ReaderMeta {
  title: string;
  description?: string | null;
  published?: string | null;
  updated?: string | null;
  category?: string | null;
  tags?: string[];
  canonicalUrl: string;
  markdownUrl: string;
  textUrl: string;
  readerUrl: string;
}

function headingText(line: string): string {
  return (
    line
      .replace(/^##\s+/, "")
      .replace(/\s+#+\s*$/, "")
      .trim() || "未命名段落"
  );
}

/** 把 frontmatter、MDX 噪音和重复的正文 H1 去掉，得到可移植的 Markdown */
export function readerBody(source: string): string {
  const portable = toPortableMarkdown(source)
    .replace(FRONTMATTER, "")
    // 正文里的 <style>/<script> 对 AI 是噪音，也可能干扰分段页自身样式
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .trim();

  return stripLeadingMarkdownHeading(portable).trim();
}

/**
 * 按空行切块，但保留代码围栏内的空行。
 * 这样后续按长度分段时不会把一段代码拆成两半。
 */
function splitBlocks(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;

  const flush = () => {
    if (current.length) {
      blocks.push(current.join("\n"));
      current = [];
    }
  };

  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;

    if (!inFence && line.trim() === "") {
      flush();
      continue;
    }

    current.push(line);
  }

  flush();
  return blocks;
}

function withContinuationHeading(markdown: string, title: string): string {
  return /^##\s+/.test(markdown)
    ? markdown
    : `## ${title}（续）\n\n${markdown}`;
}

/**
 * 把单个 H2 章节按块累加到 maxChars 以内。
 * 超长且无法按块拆分的单块会退化为硬切。
 */
function chunkSection(
  sectionMarkdown: string,
  title: string,
  maxChars: number,
): string[] {
  if (sectionMarkdown.length <= maxChars) {
    return [sectionMarkdown];
  }

  const blocks = splitBlocks(sectionMarkdown);
  const chunks: string[] = [];
  let buffer = "";

  for (const block of blocks) {
    if (!buffer) {
      buffer = block;
      continue;
    }

    if (buffer.length + 2 + block.length <= maxChars) {
      buffer += `\n\n${block}`;
      continue;
    }

    chunks.push(buffer);
    buffer = block;
  }

  if (buffer) chunks.push(buffer);

  return chunks.flatMap((chunk, index) => {
    const normalized = index === 0 ? chunk : withContinuationHeading(chunk, title);

    if (normalized.length <= maxChars) return [normalized];

    const pieces: string[] = [];
    for (let start = 0; start < normalized.length; start += maxChars) {
      pieces.push(normalized.slice(start, start + maxChars));
    }
    return pieces;
  });
}

/** 把一篇文章拆成按 H2 分节、且长度受控的阅读段 */
export function splitMarkdownParts(
  source: string,
  maxChars = READER_MAX_PART_CHARS,
): ReaderPart[] {
  const body = readerBody(source);
  if (!body) return [];

  const lines = body.split(/\r?\n/);
  const sections: Array<{ title: string; lines: string[] }> = [];
  let current: { title: string; lines: string[] } | null = null;
  let inFence = false;

  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;

    if (!inFence && /^##\s+/.test(line)) {
      if (current?.lines.join("\n").trim()) sections.push(current);
      current = { title: headingText(line), lines: [line] };
      continue;
    }

    if (!current) current = { title: "开篇", lines: [] };
    current.lines.push(line);
  }

  if (current?.lines.join("\n").trim()) sections.push(current);

  const parts: ReaderPart[] = [];

  for (const section of sections) {
    const markdown = section.lines.join("\n").trim();
    if (!markdown) continue;

    for (const chunk of chunkSection(markdown, section.title, maxChars)) {
      parts.push({
        index: parts.length + 1,
        title: section.title,
        markdown: chunk,
      });
    }
  }

  return parts;
}

function bodyLength(body: string): number {
  return new TextEncoder().encode(body).byteLength;
}

function relativeUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}

function shortDescription(value: string, max = 160): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** 统一响应头：显式 Content-Length，避免部分抓取器对 chunked 响应报错 */
export function readerResponse(
  body: string,
  status = 200,
  contentType = "text/html; charset=utf-8",
): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bodyLength(body)),
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "X-Robots-Tag": "noindex, follow",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 把相对图片 / 链接补成绝对地址，避免在 /read/2 下解析成错误路径 */
function absoluteContentUrl(url: string, baseUrl: string): string {
  if (!url) return url;
  if (/^(https?:|mailto:|tel:|data:|\/\/|#)/i.test(url)) return url;
  if (url.startsWith("/")) return `${siteConfig.url}${url}`;
  return new URL(url, baseUrl).toString();
}

export function renderMarkdownHtml(markdown: string, baseUrl: string): string {
  return renderHtml(markdown, {
    extensions: docsMarkdownExtensions(),
    allowHtml: true,
    headingIds: false,
    urlTransform: (url, _kind, defaultUrl) =>
      absoluteContentUrl(url || defaultUrl, baseUrl),
  });
}

const READER_STYLE = `
:root{color-scheme:light dark}
body{margin:0 auto;max-width:46rem;padding:1.5rem 1rem 4rem;font:16px/1.8 system-ui,-apple-system,"Segoe UI","Noto Sans SC",sans-serif;color:#1f2328;background:#fff}
a{color:#0969da}
header,footer{border-bottom:1px solid #d8dee4;padding-bottom:1rem;margin-bottom:1.5rem}
footer{border-bottom:0;border-top:1px solid #d8dee4;margin-top:2rem;padding-top:1rem}
h1{font-size:1.6rem;line-height:1.3}
h2{font-size:1.25rem;margin-top:2rem}
blockquote{margin:1.2rem 0;padding:.2rem 1rem;border-left:3px solid #d0d7de;color:#57606a}
pre{overflow-x:auto;padding:1rem;background:#f6f8fa}
code{font-family:ui-monospace,Consolas,monospace;font-size:.9em}
img{max-width:100%;height:auto}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #d0d7de;padding:.4rem .6rem;text-align:left}
.meta,.note{color:#57606a;font-size:.9rem}
@media(prefers-color-scheme:dark){body{color:#e6edf3;background:#0d1117}a{color:#58a6ff}header,footer,th,td{border-color:#30363d}blockquote{border-color:#3d444d;color:#9198a1}pre{background:#161b22}.meta,.note{color:#9198a1}}
`.trim();

function pageShell(title: string, head: string, body: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${head}
<style>${READER_STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function metaLine(meta: ReaderMeta): string {
  const bits = [
    meta.category,
    meta.published ? `发布 ${meta.published.slice(0, 10)}` : null,
    meta.updated ? `更新 ${meta.updated.slice(0, 10)}` : null,
    meta.tags?.length ? `标签：${meta.tags.join("、")}` : null,
  ].filter(Boolean);

  return bits.length ? `<p class="meta">${escapeHtml(bits.join(" · "))}</p>` : "";
}

function linkLine(meta: ReaderMeta, extra = ""): string {
  return `<p class="note"><a href="${escapeHtml(relativeUrl(meta.canonicalUrl))}">HTML 原文</a> · <a href="${escapeHtml(relativeUrl(meta.markdownUrl))}">完整 Markdown</a> · <a href="${escapeHtml(relativeUrl(meta.textUrl))}">纯文本</a>${extra}</p>`;
}

export function renderReaderIndexHtml(
  meta: ReaderMeta,
  parts: ReaderPart[],
): string {
  const head = [
    `<meta name="robots" content="noindex, follow">`,
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}">`,
    `<link rel="alternate" type="text/markdown" href="${escapeHtml(
      relativeUrl(meta.markdownUrl),
    )}">`,
    `<link rel="alternate" type="text/plain" href="${escapeHtml(
      relativeUrl(meta.textUrl),
    )}">`,
  ].join("\n");

  // 分段目录只列“节”的起点，不列每个长度分片。
  // 长文可能有几十段，逐段列出会让目录页自身超过 5000 字符。
  const sectionEntries = parts.filter(
    (part, index) => index === 0 || part.title !== parts[index - 1].title,
  );
  const MAX_INDEX_ENTRIES = 30;
  const visibleEntries = sectionEntries.slice(0, MAX_INDEX_ENTRIES);
  const omittedEntries = sectionEntries.length - visibleEntries.length;

  const items = visibleEntries
    .map(
      (part) =>
        `<li><a href="${escapeHtml(relativeUrl(meta.readerUrl))}/${part.index}">${escapeHtml(
          part.title,
        )}</a> <span class="meta">从第 ${part.index} 段开始</span></li>`,
    )
    .join("\n");

  const body = `<header>
${linkLine(meta)}
<h1>${escapeHtml(meta.title)}</h1>
${meta.description ? `<p>${escapeHtml(shortDescription(meta.description, 120))}</p>` : ""}
${metaLine(meta)}
</header>
<main>
<h2>分段阅读（共 ${parts.length} 段）</h2>
<p>每段正文控制在约 ${READER_MAX_PART_CHARS} 字以内，段末有“下一段”链接。按顺序从第 1 段开始即可读完全文。</p>
<p><strong><a href="${escapeHtml(relativeUrl(meta.readerUrl))}/1">从第 1 段开始 →</a></strong></p>
<ol>
${items}
</ol>
${omittedEntries > 0 ? `<p class="meta">另有 ${omittedEntries} 节未列出，可沿上一节的“下一段”继续。</p>` : ""}
</main>
<footer>
${linkLine(meta, ` · <a href="${escapeHtml(relativeUrl(meta.readerUrl))}">分段目录</a>`)}
</footer>`;

  return pageShell(`${meta.title} · 分段阅读`, head, body);
}

export function renderReaderPartHtml(
  meta: ReaderMeta,
  parts: ReaderPart[],
  part: ReaderPart,
): string {
  const prev = parts[part.index - 2];
  const next = parts[part.index];
  const head = [
    `<meta name="robots" content="noindex, follow">`,
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}">`,
    `<link rel="alternate" type="text/markdown" href="${escapeHtml(
      relativeUrl(meta.markdownUrl),
    )}">`,
    prev
      ? `<link rel="prev" href="${escapeHtml(relativeUrl(meta.readerUrl))}/${
          prev.index
        }">`
      : null,
    next
      ? `<link rel="next" href="${escapeHtml(relativeUrl(meta.readerUrl))}/${
          next.index
        }">`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const pager = [
    `<a href="${escapeHtml(relativeUrl(meta.readerUrl))}">分段目录</a>`,
    prev
      ? `<a href="${escapeHtml(relativeUrl(meta.readerUrl))}/${prev.index}">← 上一段</a>`
      : null,
    next
      ? `<a href="${escapeHtml(relativeUrl(meta.readerUrl))}/${next.index}">下一段 →</a>`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = `<header>
${linkLine(meta, ` · ${pager}`)}
<h1>${escapeHtml(meta.title)}</h1>
<p class="meta">第 ${part.index} / ${parts.length} 段：${escapeHtml(
    part.title,
  )}</p>
${metaLine(meta)}
</header>
<main>
${renderMarkdownHtml(part.markdown, meta.canonicalUrl)}
</main>
<footer>
<p class="pager">${pager}</p>
</footer>`;

  return pageShell(
    `${meta.title} · 第 ${part.index} / ${parts.length} 段`,
    head,
    body,
  );
}
