import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

/**
 * 对所有爬虫（含 GPTBot、ClaudeBot、Google-Extended 等 AI 爬虫）完全开放公开内容；
 * 仅屏蔽后台、登录、API 与无限参数的站内搜索。
 * AI 友好入口：/llms.txt、/llms-full.txt、文章地址追加 .md。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/auth", "/api/", "/search", "/test-error", "/icon-preview"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
