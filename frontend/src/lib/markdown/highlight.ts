import { createHighlighter } from "@tanstack/highlight/core";
import { apache } from "@tanstack/highlight/languages/apache";
import { css } from "@tanstack/highlight/languages/css";
import { diff } from "@tanstack/highlight/languages/diff";
import { dockerfile } from "@tanstack/highlight/languages/dockerfile";
import { env } from "@tanstack/highlight/languages/env";
import { html } from "@tanstack/highlight/languages/html";
import { http } from "@tanstack/highlight/languages/http";
import { js } from "@tanstack/highlight/languages/js";
import { json } from "@tanstack/highlight/languages/json";
import { jsx } from "@tanstack/highlight/languages/jsx";
import { markdown } from "@tanstack/highlight/languages/markdown";
import { mermaid } from "@tanstack/highlight/languages/mermaid";
import { nginx } from "@tanstack/highlight/languages/nginx";
import { plaintext } from "@tanstack/highlight/languages/plaintext";
import { python } from "@tanstack/highlight/languages/python";
import { shell } from "@tanstack/highlight/languages/shell";
import { sql } from "@tanstack/highlight/languages/sql";
import { toml } from "@tanstack/highlight/languages/toml";
import { ts } from "@tanstack/highlight/languages/ts";
import { tsx } from "@tanstack/highlight/languages/tsx";
import { yaml } from "@tanstack/highlight/languages/yaml";
import { createTanStackMarkdownHighlighter } from "@tanstack/highlight/markdown";

/**
 * 技术博客常用的语言白名单。
 *
 * 只注册真正需要的语言，避免把整套语法定义带进渲染链路。
 * 未注册的语言会回退到 plaintext。
 */
const highlighter = createHighlighter({
  fallbackLanguage: "plaintext",
  languages: [
    plaintext,
    html,
    css,
    js,
    jsx,
    ts,
    tsx,
    python,
    sql,
    shell,
    json,
    yaml,
    markdown,
    diff,
    dockerfile,
    env,
    http,
    nginx,
    toml,
    apache,
    mermaid,
  ],
});

/**
 * 返回 code 标签内部的 token HTML，不包含 pre/code 容器。
 * TanStack Markdown 自己的 React 渲染器负责外层容器。
 */
export const highlightMarkdownCode =
  createTanStackMarkdownHighlighter(highlighter);

export function normalizeCodeLanguage(language?: string): string {
  return highlighter.normalizeLanguage(language);
}
