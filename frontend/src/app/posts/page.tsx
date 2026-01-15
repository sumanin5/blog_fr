import { Metadata } from "next";
import { settings } from "@/config/settings";
import {
  PageCategoryResponse,
  PagePostShortResponse,
} from "@/shared/api/generated/types.gen";
import { PostListView } from "@/components/post/post-list-view";

export const metadata: Metadata = {
  title: "博客文章 | Blog FR",
  description:
    "探索技术世界，构建优秀项目。分享关于 FastAPI, Next.js, 以及全栈开发的深度实践。",
  keywords: "博客, 编程, FastAPI, Next.js, React, 技术分享",
};

/**
 * 获取文章列表数据 (服务端)
 */
async function getPosts(
  page = 1,
  size = 10,
  categoryId?: string
): Promise<PagePostShortResponse | null> {
  try {
    let url = `${settings.BACKEND_INTERNAL_URL}${settings.API_PREFIX}/posts/article?page=${page}&size=${size}`;
    if (categoryId) {
      url += `&category_id=${categoryId}`;
    }

    const res = await fetch(url, {
      next: {
        revalidate: 3600, // 1小时缓存
        tags: ["posts", "posts-list"],
      },
    });

    if (!res.ok) {
      console.error(`[SSR] Fetch posts failed: ${res.status}`);
      return null;
    }

    return (await res.json()) as PagePostShortResponse;
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return null;
  }
}

/**
 * 获取分类列表 (服务端)
 */
async function getCategories(): Promise<PageCategoryResponse | null> {
  try {
    const url = `${settings.BACKEND_INTERNAL_URL}${settings.API_PREFIX}/posts/article/categories`;
    const res = await fetch(url, {
      next: {
        revalidate: 3600, // 1小时缓存
        tags: ["categories"],
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as PageCategoryResponse;
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return null;
  }
}

interface PostsPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
  }>;
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const { page: pageStr, category: categoryId } = await searchParams;
  const page = pageStr ? parseInt(pageStr, 10) : 1;

  const [initialData, categoriesData] = await Promise.all([
    getPosts(page, 10, categoryId),
    getCategories(),
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
    />
  );
}
