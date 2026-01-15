"use server";

import { revalidateTag, revalidatePath } from "next/cache";

/**
 * 失效文章相关的所有缓存
 * 用于：创建、更新、删除文章后
 */
export async function revalidatePosts() {
  revalidateTag("posts");
  revalidateTag("posts-list");
  console.log("✅ 已失效文章缓存");
}

/**
 * 失效特定文章的缓存
 * 用于：更新单篇文章后
 */
export async function revalidatePost(slug: string) {
  revalidateTag(`post-${slug}`);
  revalidateTag("posts"); // 也失效列表
  console.log(`✅ 已失效文章缓存: ${slug}`);
}

/**
 * 失效分类缓存
 * 用于：创建、更新、删除分类后
 */
export async function revalidateCategories() {
  revalidateTag("categories");
  console.log("✅ 已失效分类缓存");
}

/**
 * 失效所有缓存
 * 用于：大量数据变更后
 */
export async function revalidateAll() {
  revalidateTag("posts");
  revalidateTag("posts-list");
  revalidateTag("categories");
  console.log("✅ 已失效所有缓存");
}

/**
 * 失效特定路径的缓存
 * 用于：需要立即更新特定页面时
 */
export async function revalidatePostsPath() {
  revalidatePath("/posts");
  console.log("✅ 已失效 /posts 路径缓存");
}
