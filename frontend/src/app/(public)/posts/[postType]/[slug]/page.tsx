import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetailView } from "@/components/public/post/views/post-detail-view";
import { getPostDetail } from "@/lib/post-api";

import { PostType } from "@/shared/api/generated";
import { getSafeImageUrl, getThumbnailUrl } from "@/lib/media-utils";

interface PageProps {
  params: Promise<{
    postType: PostType;
    slug: string;
  }>;
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
    post.excerpt || post.contentMdx?.substring(0, 150) || post.title;
  const coverUrl =
    getSafeImageUrl(post.coverMedia, "xlarge") ||
    getThumbnailUrl(post.coverMediaId, "xlarge");

  return {
    title: post.title,
    description: summary,
    keywords: post.tags?.map((t) => t.name).join(", "),
    openGraph: {
      title: post.title,
      description: summary,
      type: "article",
      publishedTime: post.publishedAt || undefined,
      authors: post.author?.username || post.author?.fullName,
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

  // 将数据传递给客户端组件进行交互渲染
  return <PostDetailView post={post} />;
}
