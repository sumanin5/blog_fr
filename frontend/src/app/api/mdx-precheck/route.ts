import { compileMDX } from "next-mdx-remote/rsc";
import { NextRequest } from "next/server";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { createMdxComponents } from "@/components/public/mdx/registry/mdx-components";
import { stripLeadingMarkdownHeading } from "@/lib/markdown/leading-heading";
import {
  convertHtmlStyleToJsx,
  findUnregisteredJsxTags,
  stripMdxFrontmatter,
} from "@/lib/markdown/mdx-preprocess";

interface PrecheckFileInput {
  path: string;
  source: string;
}

interface PrecheckError {
  path: string;
  message: string;
}

/**
 * 仅供本地开发态后端监听服务调用的 MDX 编译与组件白名单预检接口。
 * 生产环境下强制返回 404，避免暴露额外编译入口。
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "Not available in production" },
      { status: 404 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const rawFiles =
    body && typeof body === "object" && "files" in body
      ? (body as { files?: unknown }).files
      : undefined;
  if (!Array.isArray(rawFiles)) {
    return Response.json(
      { error: "`files` must be an array" },
      { status: 400 },
    );
  }

  const components = createMdxComponents();
  const registeredNames = new Set(
    Object.keys(components).filter((key) => /^[A-Z]/.test(key)),
  );
  const errors: PrecheckError[] = [];

  for (const item of rawFiles as PrecheckFileInput[]) {
    if (
      !item ||
      typeof item.path !== "string" ||
      typeof item.source !== "string"
    ) {
      errors.push({ path: "unknown", message: "Invalid file payload item" });
      continue;
    }

    const bodyWithoutFrontmatter = stripMdxFrontmatter(item.source);
    const unknownTags = findUnregisteredJsxTags(
      bodyWithoutFrontmatter,
      registeredNames,
    );
    if (unknownTags.length > 0) {
      errors.push({
        path: item.path,
        message: `未注册的 JSX 组件: ${unknownTags.join(", ")}`,
      });
      continue;
    }

    const processedMdx = convertHtmlStyleToJsx(
      stripLeadingMarkdownHeading(bodyWithoutFrontmatter),
    );
    try {
      await compileMDX({
        source: processedMdx,
        options: {
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkMath],
            rehypePlugins: [rehypeKatex],
          },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ path: item.path, message });
    }
  }

  if (errors.length > 0) {
    return Response.json({ ok: false, errors }, { status: 422 });
  }

  return Response.json({ ok: true, checked: rawFiles.length });
}
