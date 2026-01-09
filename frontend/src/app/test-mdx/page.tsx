"use client";

import { useEffect, useState } from "react";
import { PostContent } from "@/components/post/post-content";
import { PostMeta } from "@/components/post/post-meta";
import { PostToc } from "@/components/post/post-toc";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PostData {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_html: string;
  content_mdx: string;
  published_at: string;
  reading_time: number;
  view_count: number;
  toc: Array<{ id: string; title: string; level: number }>;
  author: { username: string; avatar?: string };
  tags: Array<{ id: string; name: string }>;
}

/**
 * MDX 测试页面
 *
 * 用于测试后端 MDX 处理和前端渲染
 * 访问: http://localhost:3000/test-mdx
 */
export default function TestMdxPage() {
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTestPost() {
      try {
        // 获取最新的文章（假设测试文章是最新的）
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/posts/article?limit=1&status=published`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
          // 获取文章详情
          const postId = data.items[0].id;
          const detailResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/posts/article/${postId}`
          );

          if (!detailResponse.ok) {
            throw new Error(
              `HTTP ${detailResponse.status}: ${detailResponse.statusText}`
            );
          }

          const postData = await detailResponse.json();
          setPost(postData);
        } else {
          setError("没有找到测试文章。请先运行后端测试脚本创建文章。");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    }

    fetchTestPost();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>错误：</strong> {error}
            <br />
            <br />
            <strong>解决方法：</strong>
            <ol className="ml-4 mt-2 list-decimal space-y-1">
              <li>确保后端服务正在运行（http://localhost:8000）</li>
              <li>
                运行测试脚本创建文章：
                <code className="ml-2 rounded bg-muted px-2 py-1">
                  cd backend && python scripts/test_mdx.py
                </code>
              </li>
              <li>刷新此页面</li>
            </ol>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            没有找到测试文章。请运行：
            <code className="ml-2 rounded bg-muted px-2 py-1">
              cd backend && python scripts/test_mdx.py
            </code>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* 测试信息横幅 */}
        <Alert className="mb-8 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>MDX 测试页面</strong> - 这是一个测试页面，用于验证 MDX
            功能。
            <br />
            文章 ID: <code>{post.id}</code> | Slug: <code>{post.slug}</code>
          </AlertDescription>
        </Alert>

        {/* 文章标题 */}
        <h1 className="mb-6 text-4xl font-bold">{post.title}</h1>

        {/* 文章元信息 */}
        <PostMeta
          author={post.author}
          publishedAt={post.published_at}
          readingTime={post.reading_time}
          viewCount={post.view_count}
          className="mb-8"
        />

        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_250px]">
          {/* 文章内容 */}
          <PostContent html={post.content_html} />

          {/* 侧边栏：目录 */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <PostToc toc={post.toc} />
            </div>
          </aside>
        </div>

        {/* 调试信息 */}
        <details className="mt-12 rounded-lg border border-border p-4">
          <summary className="cursor-pointer font-semibold">
            🔍 调试信息（点击展开）
          </summary>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <strong>文章 ID:</strong> {post.id}
            </div>
            <div>
              <strong>Slug:</strong> {post.slug}
            </div>
            <div>
              <strong>阅读时间:</strong> {post.reading_time} 分钟
            </div>
            <div>
              <strong>浏览量:</strong> {post.view_count}
            </div>
            <div>
              <strong>目录项数:</strong> {post.toc?.length || 0}
            </div>
            <div>
              <strong>HTML 长度:</strong> {post.content_html?.length || 0} 字符
            </div>
            <div>
              <strong>MDX 长度:</strong> {post.content_mdx?.length || 0} 字符
            </div>
            <div>
              <strong>摘要:</strong>
              <p className="mt-1 text-muted-foreground">{post.excerpt}</p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
