import React from "react";
// 确保 API 客户端已在服务端配置
import "@/shared/api/config";
import { listCategoriesByType, PostType } from "@/shared/api/generated";
import { CreateView } from "./create-view";

interface PageProps {
  params: Promise<{
    type: string;
  }>;
}

export default async function NewPostByTypePage({ params }: PageProps) {
  const { type } = await params;
  const postType = (type as PostType) || "article";

  // 并行获取分类和标签
  const [categoriesRes] = await Promise.all([
    listCategoriesByType({
      path: { post_type: postType },
      query: { size: 100, include_inactive: true },
    }).catch(() => ({ data: null })),
  ]);

  const categories = categoriesRes.data?.items || [];

  return <CreateView postType={postType} categories={categories} />;
}
