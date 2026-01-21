"use client";

import { useEffect, useState } from "react";
import { Save, Eye, FileText, ChevronLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MdxClientRenderer } from "@/components/post/content/renderers/mdx-client-renderer";
import { CategoryResponse } from "@/shared/api/generated";
import type { PostStatus } from "@/shared/api/generated";
import { useEditorStore } from "@/stores/use-editor-store";

import {
  PostMetadataSidebar,
  POST_STATUS_VALUES,
  PostMetadata,
} from "./post-metadata-sidebar";

import type { MediaFileResponse } from "@/hooks/use-media";

import "@uiw/react-md-editor/markdown-editor.css";

// 动态导入编辑器（避免 SSR 问题）
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
});

interface PostEditorProps {
  postId?: string; // Add an ID to identify which post we are editing so persistence works per-post
  initialData: {
    title: string;
    slug: string;
    contentMdx: string;
    coverMedia?: MediaFileResponse | null;
    categoryId?: string | null;
    status?: PostStatus;
    tags?: string[];
    isFeatured?: boolean;
    enableJsx?: boolean;
    useServerRendering?: boolean;
    excerpt?: string | null;
  };
  postType?: "article" | "idea";
  categories: CategoryResponse[];
  onSave: (data: {
    title: string;
    slug: string;
    contentMdx: string;
    cover_media_id?: string | null;
    category_id?: string | null;
    status?: PostStatus;
    tags?: string[];
    is_featured?: boolean;
    enable_jsx?: boolean;
    use_server_rendering?: boolean;
    excerpt?: string | null;
  }) => void;
  isSaving?: boolean;
}

export function PostEditor({
  postId = "new", // default to 'new' if not provided
  initialData,
  postType = "article",
  categories,
  onSave,
  isSaving,
}: PostEditorProps) {
  const { theme } = useTheme();

  // Zustand State Selectors
  const {
    title,
    contentMdx,
    metadata,
    initializeEditor,
    setTitle,
    setContent,
    setMetadata,
  } = useEditorStore();

  // Initialize store on mount or ID change
  useEffect(() => {
    initializeEditor(postId, {
      title: initialData.title,
      contentMdx: initialData.contentMdx,
      metadata: {
        slug: initialData.slug,
        status: initialData.status || POST_STATUS_VALUES.DRAFT,
        categoryId: initialData.categoryId || "none",
        tags: initialData.tags || [],
        cover: initialData.coverMedia || null,
        excerpt: initialData.excerpt || "",
        isFeatured: initialData.isFeatured || false,
        enableJsx: initialData.enableJsx || false,
        useServerRendering: initialData.useServerRendering || false,
      },
    });
  }, [postId, initialData, initializeEditor]);

  const [activeTab, setActiveTab] = useState("edit");

  const handleSave = () => {
    onSave({
      title,
      slug: metadata.slug,
      contentMdx,
      cover_media_id: metadata.cover?.id || null,
      category_id: metadata.categoryId === "none" ? null : metadata.categoryId,
      status: metadata.status,
      tags: metadata.tags,
      is_featured: metadata.isFeatured,
      enable_jsx: metadata.enableJsx,
      use_server_rendering: metadata.useServerRendering,
      excerpt: metadata.excerpt || null,
    });
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/posts/${postType}/me`}>
              <ChevronLeft className="mr-2 h-4 w-4" /> 返回
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <h2 className="text-lg font-semibold truncate max-w-[300px]">
            {/* Show title from store, fallbacks handled in store init */}
            {title || "未命名文章"}
          </h2>
          <div
            className={`px-2 py-0.5 rounded text-xs border ${
              metadata.status === POST_STATUS_VALUES.PUBLISHED
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
            }`}
          >
            {metadata.status === POST_STATUS_VALUES.PUBLISHED
              ? "已发布"
              : "草稿"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {metadata.status !== POST_STATUS_VALUES.PUBLISHED && (
            <Button variant="outline" size="sm" onClick={handleSave}>
              存为草稿
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />{" "}
            {metadata.status === POST_STATUS_VALUES.PUBLISHED
              ? "更新文章"
              : "发布文章"}
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 overflow-hidden">
        {/* 左侧编辑器区域 */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="title">文章标题</Label>
            <Input
              id="title"
              placeholder="输入引人入胜的标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-bold"
            />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <TabsList className="w-fit">
              <TabsTrigger value="edit" className="gap-2">
                <FileText className="size-4" /> 编辑正文
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="size-4" /> 实时预览
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="flex-1 mt-4 overflow-hidden">
              <div className="h-full" data-color-mode={theme}>
                <MDEditor
                  value={contentMdx}
                  onChange={(val) => setContent(val || "")}
                  height="100%"
                  preview="edit"
                  hideToolbar={false}
                  enableScroll={true}
                  visibleDragbar={false}
                  textareaProps={{
                    placeholder: "使用 Markdown 开始你的创作...",
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="preview"
              className="flex-1 mt-4 border rounded-md overflow-auto bg-background"
            >
              <div className="p-4 md:p-8">
                <div className="mx-auto max-w-4xl">
                  <MdxClientRenderer
                    mdx={contentMdx}
                    toc={[]}
                    articleClassName="prose prose-slate dark:prose-invert max-w-none"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 右侧设置区域 */}
        <div className="border-l pl-4 h-full overflow-hidden">
          <PostMetadataSidebar
            postType={postType}
            categories={categories}
            metadata={metadata}
            onChange={setMetadata}
          />
        </div>
      </div>
    </div>
  );
}
