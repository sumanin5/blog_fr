/**
 * 面向爬虫 / LLM 的 Markdown 导出
 *
 * /posts/:type/:slug.md、/raw 与 llms-full.txt 共用：保证三处输出一致。
 * MDX 中的交互组件对模型是噪音，这里降级为文字说明，保留其中的正文内容。
 */

import { createServerFetch, serverClient } from "@/lib/server-api-client";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";
import { getPostBySlug } from "@/shared/api/generated/sdk.gen";
import type { PostDetailResponse, PostType } from "@/shared/api/generated/types.gen";
import { normalizeApiResponse, type ApiData } from "@/shared/api/transformers";

const FENCE = /^\s*(```|~~~)/;
// MDX 顶层 ESM 语句（只匹配语法形态，避免误删以 import 开头的正文）
const ESM = /^(import\s.+\sfrom\s|import\s+["']|export\s+(const|let|function|default)\b)/;
// 块级标签行：<Tag ...>、</Tag>、<Tag ... />（可跨多行）
const TAG_START = /^\s*<\/?([A-Za-z][\w.]*)/;

/** 标签是否只能由 MDX/JSX 解析：组件（大写开头）或带 {表达式} 属性 */
function isJsxOnly(tagSource: string, name: string): boolean {
  return /^[A-Z]/.test(name) || /=\s*\{/.test(tagSource);
}

/**
 * 把 MDX 降级为可移植的 Markdown：
 * - 去掉 import/export
 * - 自闭合组件 `<Chart />` → `*[交互内容：Chart，请在原文页面查看]*`
 * - 成对组件与带 JSX 表达式的 HTML 标签：去掉标签，保留内部正文
 * - 代码围栏内的内容原样保留
 */
export function toPortableMarkdown(source: string): string {
  const lines = source.split("\n");
  const out: string[] = [];
  // 尚未闭合的独占一行开标签；removed 表示该标签已被移除，配对的闭标签也要移除
  const open: { name: string; removed: boolean }[] = [];
  let inFence = false;

  // 被移除的包裹标签内的正文去掉缩进，避免 4 空格缩进被当成代码块
  const insideRemoved = () => open.some((tag) => tag.removed);
  const push = (text: string) => out.push(insideRemoved() ? text.trimStart() : text);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (FENCE.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    if (ESM.test(line)) continue;

    const match = TAG_START.exec(line);
    if (!match) {
      push(line);
      continue;
    }

    // 收集可能跨多行的标签，直到遇到 ">"
    let tag = line;
    while (!/>\s*$|\/>/.test(tag) && i + 1 < lines.length) {
      tag += `\n${lines[++i]}`;
    }

    const name = match[1];
    const trimmed = tag.trim();
    const isClosing = trimmed.startsWith("</");

    // 闭标签：与最近的同名开标签配对；开标签已被移除则一并移除
    if (isClosing) {
      const index = open.map((t) => t.name).lastIndexOf(name);
      const pair = index >= 0 ? open.splice(index, 1)[0] : undefined;
      if (!pair?.removed) push(tag);
      continue;
    }

    const selfClosing = /\/>$/.test(trimmed);
    const inline = /^<[^>]+>([\s\S]*)<\/[^>]+>$/.exec(trimmed);

    if (!isJsxOnly(tag, name)) {
      if (!selfClosing && !inline) open.push({ name, removed: false });
      push(tag);
      continue;
    }

    if (selfClosing) {
      push(`*[交互内容：${name}，请在原文页面查看]*`);
      continue;
    }
    // 单行成对标签：<Tag ...>文本</Tag> → 文本
    if (inline) {
      push(inline[1].trim());
      continue;
    }
    // 开标签独占一行：移除，正文保留在后续行，等待配对的闭标签
    open.push({ name, removed: true });
  }

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

type PostDetail = ApiData<PostDetailResponse>;

/** 文章 Markdown：YAML frontmatter（标题、原文地址、时间、标签）+ 可移植正文 */
export function renderPostMarkdown(
  post: PostDetail,
  postType: PostType,
  slug: string,
): string {
  const url = absoluteUrl(routes.postDetailSlug(postType, slug));
  const meta = [
    `title: ${yamlString(post.title)}`,
    `url: ${url}`,
    post.excerpt ? `description: ${yamlString(post.excerpt)}` : null,
    post.publishedAt ? `published: ${post.publishedAt}` : null,
    post.updatedAt ? `updated: ${post.updatedAt}` : null,
    post.category?.name ? `category: ${yamlString(post.category.name)}` : null,
    post.tags?.length
      ? `tags: [${post.tags.map((t) => yamlString(t.name)).join(", ")}]`
      : null,
  ].filter(Boolean);

  return `---\n${meta.join("\n")}\n---\n\n${toPortableMarkdown(post.contentMdx ?? "")}\n`;
}

/** 获取已发布文章；草稿、无正文或不存在时返回 null（纯文本入口没有登录态） */
export async function getPublishedPost(
  postType: string,
  slug: string,
): Promise<PostDetail | null> {
  const { data, error } = await getPostBySlug({
    client: serverClient,
    path: { post_type: postType as PostType, slug },
    fetch: createServerFetch({ tags: ["posts", `post-${slug}`] }),
  });
  if (error || !data) return null;

  const post = normalizeApiResponse(data);
  if (post.status !== "published" || !post.contentMdx) return null;
  return post;
}
