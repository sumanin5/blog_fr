import React from "react";
import "@/shared/api/config";
import { listCategoriesByType, PostType } from "@/shared/api/generated";
import { CreateView } from "./create-view";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{
    type?: string;
  }>;
}

export default async function NewPostPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const postType = (params.type as PostType) || "article";

  // 验证 post_type
  if (!["article", "idea"].includes(postType)) {
    redirect("/admin/posts");
  }

  const [categoriesRes] = await Promise.all([
    listCategoriesByType({
      path: { post_type: postType },
      query: { include_inactive: true },
    }).catch(() => ({ data: null })),
  ]);

  const categories = categoriesRes.data?.items || [];

  return <CreateView postType={postType} categories={categories} />;
}
