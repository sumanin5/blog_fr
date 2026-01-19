import React from "react";
// 确保 API 客户端已在服务端配置
import "@/shared/api/config";
import {
  listCategoriesByType,
  listTagsByType,
  getPostById,
  PostType,
} from "@/shared/api/generated";
import { EditView } from "./edit-view";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

export default async function EditPostPage({ params }: PageProps) {
  const { type, id } = await params;
  const postType = (type as PostType) || "article";

  // 并行获取文章详情、分类列表和标签列表
  const [postRes, categoriesRes, tagsRes] = await Promise.all([
    getPostById({
      path: { post_type: postType, post_id: id },
      query: { include_mdx: true },
    }).catch(() => ({ data: null, error: true })),
    listCategoriesByType({
      path: { post_type: postType },
      query: { size: 100, include_inactive: true },
    }).catch(() => ({ data: null })),
    listTagsByType({
      path: { post_type: postType },
      query: { size: 100 },
    }).catch(() => ({ data: null })),
  ]);

  if (!postRes.data) {
    // 如果获取失败，显示 404
    notFound();
  }

  const post = postRes.data;
  const categories = categoriesRes.data?.items || [];
  const tags = tagsRes.data?.items || [];

  return (
    <EditView
      post={post}
      postType={postType}
      categories={categories}
      tags={tags}
    />
  );
}
