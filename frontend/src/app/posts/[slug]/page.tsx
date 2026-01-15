import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetailView } from "@/components/post/post-detail-view";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

import { PostDetailResponse } from "@/shared/api/generated/types.gen";
import { settings } from "@/config/settings";

// 1. 获取数据的辅助函数
async function getPost(slug: string): Promise<PostDetailResponse | null> {
  try {
    const url = `${settings.BACKEND_INTERNAL_URL}${settings.API_PREFIX}/posts/article/slug/${slug}`;

    const res = await fetch(url, {
      next: {
        revalidate: 3600, // 1小时缓存
        tags: ["posts", `post-${slug}`],
      },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.error(`[SSR] Fetch failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as PostDetailResponse;
    return data;
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return null;
  }
}

// 2. 动态生成 SEO 元数据
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "文章不存在",
    };
  }

  const summary =
    post.excerpt || post.content_html?.substring(0, 150) || post.title;

  return {
    title: post.title,
    description: summary,
    keywords: post.tags?.map((t) => t.name).join(", "),
    openGraph: {
      title: post.title,
      description: summary,
      type: "article",
      publishedTime: post.published_at || undefined,
      authors: post.author?.full_name || post.author?.username,
      images: [], // 目前 PostDetailResponse 中没有直接的 cover_image URL，先置空
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: summary,
      images: [],
    },
  };
}

// 3. 服务端页面组件
export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  // 将数据传递给客户端组件进行交互渲染
  return <PostDetailView post={post} />;
}
