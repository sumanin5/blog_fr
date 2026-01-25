import { Metadata } from "next";
import { PostListView } from "@/components/post/views/post-list-view";
import { getPosts, getCategories } from "@/lib/post-api";
import type { PostType } from "@/shared/api/generated/types.gen";

interface PostsPageProps {
  params: Promise<{
    postType: PostType;
  }>;
  searchParams: Promise<{
    page?: string;
    category?: string;
  }>;
}

export async function generateMetadata({
  params,
}: PostsPageProps): Promise<Metadata> {
  const { postType } = await params;
  const title = postType === "article" ? "博客文章" : "想法感悟";
  return {
    title: `${title} | Blog FR`,
    description:
      postType === "article"
        ? "探索技术世界，构建优秀项目。分享关于 FastAPI, Next.js, 以及全栈开发的深度实践."
        : "记录碎碎念、灵感碎片与生活感悟。",
  };
}

export default async function PostsPage({
  params,
  searchParams,
}: PostsPageProps) {
  const { postType } = await params;
  const { page: pageStr, category: categoryId } = await searchParams;
  const page = pageStr ? parseInt(pageStr, 10) : 1;

  const [initialData, categoriesData] = await Promise.all([
    getPosts(postType, page, 10, categoryId),
    getCategories(postType),
  ]);

  if (!initialData) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold">暂时无法加载文章列表</h1>
        <p className="mt-4 text-muted-foreground">请稍后重试</p>
      </div>
    );
  }

  return (
    <PostListView
      initialData={initialData}
      categories={categoriesData?.items || []}
      currentCategory={categoryId}
      page={page}
      postType={postType}
    />
  );
}
