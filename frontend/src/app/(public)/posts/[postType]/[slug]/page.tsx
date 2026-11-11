import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetailView } from "@/components/public/post/views/post-detail-view";
import { siteConfig } from "@/config/site";
import { getSafeImageUrl, getThumbnailUrl } from "@/lib/media-utils";
import { getPostDetail } from "@/lib/post-api";
import { routes } from "@/lib/routes";
import { absoluteUrl, toPlainExcerpt } from "@/lib/seo";

import { PostType } from "@/shared/api/generated";

interface PageProps {
  params: Promise<{
    postType: PostType;
    slug: string;
  }>;
}

export const revalidate = 300;

// 不在构建期预渲染（构建环境不一定能访问后端），首次访问后生成并缓存；
// 后台发布/GitOps 同步通过 posts、post-{slug} 标签按需失效
export function generateStaticParams() {
  return [];
}

// 获取文章详情数据的
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { postType, slug } = await params;
  const post = await getPostDetail(postType, slug);

  if (!post) {
    return {
      title: "文章不存在",
    };
  }

  const summary =
    post.excerpt ||
    (post.contentMdx ? toPlainExcerpt(post.contentMdx) : "") ||
    post.title;
  const url = routes.postDetailSlug(postType, slug);
  const coverUrl =
    getSafeImageUrl(post.coverMedia, "xlarge") ||
    getThumbnailUrl(post.coverMediaId, "xlarge");
  const authorName = post.author?.fullName || post.author?.username;

  return {
    title: post.title,
    description: summary,
    keywords: post.tags?.map((t) => t.name),
    authors: authorName ? [{ name: authorName }] : undefined,
    alternates: {
      canonical: url,
      types: {
        // 放在第一位：只接受 HTML 的抓取工具会优先发现分段阅读入口
        "text/html": routes.postRead(postType, slug),
        // 供 AI 工具发现干净的 Markdown / 纯文本版本
        "text/markdown": routes.postMarkdown(postType, slug),
        "text/plain": routes.postText(postType, slug),
        "application/rss+xml": [{ url: "/rss.xml", title: siteConfig.name }],
      },
    },
    openGraph: {
      title: post.title,
      description: summary,
      type: "article",
      url,
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt || undefined,
      authors: authorName ? [authorName] : undefined,
      section: post.category?.name,
      tags: post.tags?.map((t) => t.name),
      images: coverUrl ? [coverUrl] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: summary,
      images: coverUrl ? [coverUrl] : [],
    },
  };
}

// 3. 服务端页面组件
export default async function Page({ params }: PageProps) {
  const { postType, slug } = await params;
  const post = await getPostDetail(postType, slug);

  if (!post) {
    notFound();
  }

  const url = absoluteUrl(routes.postDetailSlug(postType, slug));
  const authorName = post.author?.fullName || post.author?.username;
  const coverUrl =
    getSafeImageUrl(post.coverMedia, "xlarge") ||
    getThumbnailUrl(post.coverMediaId, "xlarge");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": postType === "articles" ? "BlogPosting" : "SocialMediaPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    url,
    mainEntityOfPage: url,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || undefined,
    image: absoluteUrl(coverUrl ?? siteConfig.ogImage),
    author: authorName ? { "@type": "Person", name: authorName } : undefined,
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    keywords: post.tags?.map((t) => t.name).join(", ") || undefined,
    articleSection: post.category?.name,
    inLanguage: "zh-CN",
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON 中的 "<" 需转义，防止正文内容提前闭合 script 标签
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <PostDetailView post={post} />
    </>
  );
}
