"use server";

import { revalidateTag, revalidatePath, updateTag } from "next/cache";

/**
 * 更新文章相关的所有缓存
 * 用于：创建、更新、删除文章后
 * 在 Next.js 16 中，Server Action 推荐使用 updateTag
 */
export async function revalidatePosts() {
  await updateTag("posts");
  await updateTag("posts-list");
  console.log("✅ 已通过 updateTag 更新文章缓存");
}

/**
 * 更新特定文章的缓存
 * 用于：更新单篇文章后
 */
export async function revalidatePost(slug: string) {
  await updateTag(`post-${slug}`);
  await updateTag("posts");
  console.log(`✅ 已通过 updateTag 更新文章缓存: ${slug}`);
}

/**
 * 更新分类缓存
 * 用于：创建、更新、删除分类后
 */
export async function revalidateCategories() {
  await updateTag("categories");
  console.log("✅ 已通过 updateTag 更新分类缓存");
}

/**
 * 失效所有缓存
 * 用于：大量数据变更后
 * revalidateTag 用于彻底清除缓存
 */
export async function revalidateAll() {
  // 根据定义，revalidateTag(tag, profile) 需要第二个参数
  // 我们传入 "default" 或作为临时方案强制类型断言
  const profile = "default";
  try {
    await (revalidateTag as any)("posts", profile);
    await (revalidateTag as any)("posts-list", profile);
    await (revalidateTag as any)("categories", profile);
    console.log("✅ 已使用 revalidateTag 清除所有缓存");
  } catch (err) {
    // 如果运行时不支持第二个参数，退回到 updateTag
    await updateTag("posts");
    await updateTag("posts-list");
    await updateTag("categories");
    console.log("✅ revalidateTag 失败，已降级使用 updateTag");
  }
}

/**
 * 失效特定路径的缓存
 */
export async function revalidatePostsPath() {
  await revalidatePath("/posts", "page");
  console.log("✅ 已失效 /posts 路径缓存");
}
