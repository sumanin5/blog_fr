import React from "react";
import "@/shared/api/config";
import {
  listCategoriesByType,
  getPostById,
  PostType,
} from "@/shared/api/generated";
import { EditView } from "./edit-view";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params;

  // 先获取文章详情，从中读取 post_type
  const postRes = await getPostById({
    path: { post_type: "article", post_id: id }, // 先用 article 试试
    query: { include_mdx: true },
  }).catch(() =>
    getPostById({
      path: { post_type: "idea", post_id: id }, // 失败就试 idea
      query: { include_mdx: true },
    }).catch(() => ({ data: null, error: true }))
  );

  if (!postRes.data) {
    notFound();
  }

  const post = postRes.data;
  const postType = post.post_type as PostType;

  // 获取分类列表
  const categoriesRes = await listCategoriesByType({
    path: { post_type: postType },
    query: { include_inactive: true },
  }).catch(() => ({ data: null }));

  const categories = categoriesRes.data?.items || [];

  return <EditView post={post} postType={postType} categories={categories} />;
}
