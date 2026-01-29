import { Metadata } from "next";
import { PostListView } from "@/components/public/post/views/post-list-view";
import { getPosts, getHotTags } from "@/lib/post-api";
import type { PostType } from "@/shared/api/generated/types.gen";

interface PostsPageProps {
  params: Promise<{
    postType: PostType;
  }>;
  searchParams: Promise<{
    page?: string;
    tag?: string;
  }>;
}
export default async function PostsPage({
  params,
  searchParams,
}: PostsPageProps) {
  const { postType } = await params;
  const { page: pageStr, tag: tagId } = await searchParams;
  const page = pageStr ? parseInt(pageStr, 10) : 1;

  // 获取热门标签代替分类
  const [initialData, tagsData] = await Promise.all([
    getPosts(postType, page, 10, undefined, tagId),
    getHotTags(postType, 3),
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
      tags={tagsData?.items || []}
      currentTag={tagId}
      page={page}
      postType={postType}
    />
  );
}
