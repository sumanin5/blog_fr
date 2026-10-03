import { PostListView } from "@/components/public/post/views/post-list-view";
import { getPosts, getHotTags, getCategories } from "@/lib/post-api";
import type {
  PostType,
  PostShortResponse,
} from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";
import { redirect } from "next/navigation";
import { IdeaStreamView } from "@/components/public/ideas/idea-stream-view";
import {
  MOCK_THOUGHTS,
  MOCK_IDEA_DOMAINS,
  type IdeaDomain,
} from "@/config/home-mock-data";

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

  // 🚀 1. 核心架构革新：文章板块不再保留平铺大杂烩，统一收拢至“专栏专题地图”
  if (postType === "articles") {
    redirect("/posts/articles/categories");
  }

  // 🚀 2. 想法板块：独立打造单篇即读流（Memos Stream）并支持领域分类切换
  if (postType === "ideas") {
    let ideas: ApiData<PostShortResponse>[] = [];
    let domains: IdeaDomain[] = MOCK_IDEA_DOMAINS;

    try {
      const [ideasRes, categoriesRes] = await Promise.allSettled([
        getPosts("ideas", 1, 50),
        getCategories("ideas"),
      ]);

      if (ideasRes.status === "fulfilled" && ideasRes.value?.items?.length) {
        ideas = ideasRes.value.items;
      }

      if (
        categoriesRes.status === "fulfilled" &&
        categoriesRes.value?.items?.length
      ) {
        const rawCats = categoriesRes.value.items.filter(
          (c) => c.isActive !== false,
        );
        const dynamicDomains: IdeaDomain[] = [
          {
            id: "all",
            name: "全部领域",
            slug: "all",
            description: "所有维度的灵感随想",
            icon: "✨",
            count: ideas.length,
          },
          ...rawCats.map((cat, idx) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description || cat.excerpt || "",
            icon: cat.iconPreset || (idx % 2 === 0 ? "💡" : "⚡"),
            count:
              cat.postCount ??
              ideas.filter((i) => i.category?.id === cat.id).length,
          })),
        ];
        domains = dynamicDomains;
      }
    } catch (e) {
      console.warn("Failed to load ideas from backend, fallback to showcase:", e);
    }

    const displayIdeas = ideas.length > 0 ? ideas : MOCK_THOUGHTS;

    return (
      <IdeaStreamView
        initialIdeas={displayIdeas}
        domains={domains}
        totalCount={displayIdeas.length}
      />
    );
  }

  // 3. 通用兜底列表 (如果有其他 postType)
  const { page: pageStr, tag: tagId } = await searchParams;
  const page = pageStr ? parseInt(pageStr, 10) : 1;

  const [initialData, tagsData] = await Promise.all([
    getPosts(postType, page, 10, undefined, tagId),
    getHotTags(postType, 3),
  ]);

  if (!initialData) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold">暂时无法加载内容列表</h1>
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
