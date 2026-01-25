"use client";

import { useState } from "react";
import { Save, Eye, FileText, ChevronLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MdxClientRenderer } from "@/components/post/content/renderers/mdx-client-renderer";
import { PostType, PostStatus } from "@/shared/api/generated";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import { useCategoriesAdmin } from "@/hooks/admin/categories";
import { PostMetadataSidebar, PostMetadata } from "./post-metadata-sidebar";

import "@uiw/react-md-editor/markdown-editor.css";

// 动态导入编辑器（避免 SSR 问题）
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
});

// 定义编辑器的初始数据结构
export interface PostEditorInitialData {
  title: string;
  slug: string;
  contentMdx: string;
  coverMedia?: any; // 放宽类型以兼容
  categoryId?: string | null;
  status?: PostStatus;
  tags?: string[];
  excerpt?: string;
  isFeatured?: boolean;
  enableJsx?: boolean;
  useServerRendering?: boolean;
}

interface PostEditorProps {
  initialData: PostEditorInitialData;
  postType?: PostType;
  onSave: (data: any) => void;
  isSaving?: boolean;
}

export function PostEditor({
  initialData,
  postType = "article",
  onSave,
  isSaving,
}: PostEditorProps) {
  const { theme } = useTheme();

  // 获取分类列表用于传递给 Sidebar
  const { categories } = useCategoriesAdmin(postType);

  // 核心内容状态
  const [title, setTitle] = useState(initialData.title);
  const [contentMdx, setContentMdx] = useState(initialData.contentMdx);
  const [activeTab, setActiveTab] = useState("edit");

  // 元数据状态 (统一管理)
  const [metadata, setMetadata] = useState<PostMetadata>({
    slug: initialData.slug,
    status: initialData.status || "draft",
    categoryId: initialData.categoryId || "",
    tags: initialData.tags || [],
    cover: initialData.coverMedia || null,
    excerpt: initialData.excerpt || "",
    isFeatured: initialData.isFeatured || false,
    enableJsx: initialData.enableJsx || false,
    useServerRendering: initialData.useServerRendering || false,
  });

  const handleSave = () => {
    onSave({
      title,
      // 核心内容
      content_mdx: contentMdx,
      // 元数据映射
      slug: metadata.slug,
      status: metadata.status,
      category_id: metadata.categoryId || null,
      tags: metadata.tags, //这里只传 tag names，后端会自动处理
      excerpt: metadata.excerpt,
      cover_media_id: metadata.cover?.id || null,
      is_featured: metadata.isFeatured,
      enable_jsx: metadata.enableJsx,
      use_server_rendering: metadata.useServerRendering,
    });
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Link href={`/admin/posts/${postType}/me` as any}>
            <AdminActionButton
              variant="ghost"
              size="sm"
              icon={ChevronLeft}
              className="px-0 hover:bg-transparent hover:text-primary"
            >
              返回
            </AdminActionButton>
          </Link>
          <div className="h-4 w-px bg-border" />
          <h2 className="text-lg font-semibold truncate max-w-[300px]">
            {title || "未命名文章"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <AdminActionButton
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            loadingText="保存中"
            icon={Save}
          >
            保存并发布
          </AdminActionButton>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 overflow-hidden">
        {/* 左侧编辑器区域 */}
        <div className="flex flex-col gap-4 overflow-hidden h-full">
          <div className="space-y-2">
            <Label htmlFor="title" className="sr-only">
              文章标题
            </Label>
            <Input
              id="title"
              placeholder="输入引人入胜的标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold h-14 border-none shadow-none px-0 focus-visible:ring-0 bg-transparent"
            />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <TabsList className="w-fit bg-transparent p-0 border-b w-full justify-start rounded-none h-auto">
              <TabsTrigger
                value="edit"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
              >
                <FileText className="size-4" /> 编辑正文
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
              >
                <Eye className="size-4" /> 实时预览
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="edit"
              className="flex-1 mt-4 overflow-hidden relative group"
            >
              <div className="h-full" data-color-mode={theme}>
                <MDEditor
                  value={contentMdx}
                  onChange={(val: string | undefined) =>
                    setContentMdx(val || "")
                  }
                  height="100%"
                  preview="edit"
                  hideToolbar={false}
                  enableScroll={true}
                  visibleDragbar={false}
                  textareaProps={{
                    placeholder: "使用 Markdown 开始你的创作...",
                  }}
                  className="!border-none"
                />
              </div>
            </TabsContent>

            <TabsContent
              value="preview"
              className="flex-1 mt-4 border rounded-md overflow-auto bg-background/50 backdrop-blur-sm"
            >
              <div className="p-8 max-w-4xl mx-auto min-h-full bg-card shadow-sm rounded-xl border">
                {title && (
                  <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-8">
                    {title}
                  </h1>
                )}
                <MdxClientRenderer
                  mdx={contentMdx}
                  toc={[]}
                  articleClassName="prose prose-slate dark:prose-invert max-w-none"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 右侧设置区域 - 使用统一的 Sidebar 组件 */}
        <div className="border-l pl-6 h-full overflow-hidden">
          <PostMetadataSidebar
            postType={postType as "article" | "idea"}
            categories={categories}
            metadata={metadata}
            onChange={setMetadata}
          />
        </div>
      </div>
    </div>
  );
}
