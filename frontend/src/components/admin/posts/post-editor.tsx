"use client";

import { useState } from "react";
import {
  Save,
  Eye,
  Settings as SettingsIcon,
  FileText,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { CategorySelect } from "./category-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MdxClientRenderer } from "@/components/post/content/renderers/mdx-client-renderer";
import { PostType } from "@/shared/api/generated";

import { CoverSelect } from "@/components/admin/media/cover-select";
import type { MediaFileResponse } from "@/hooks/admin/use-media";

import "@uiw/react-md-editor/markdown-editor.css";

// 动态导入编辑器（避免 SSR 问题）
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
});

interface PostEditorProps {
  initialData: {
    title: string;
    slug: string;
    contentMdx: string;
    coverMedia?: MediaFileResponse | null;
    categoryId?: string | null;
  };
  postType?: "article" | "idea";
  onSave: (data: {
    title: string;
    slug: string;
    contentMdx: string;
    cover_media_id?: string | null;
    category_id?: string | null;
  }) => void;
  isSaving?: boolean;
}

export function PostEditor({
  initialData,
  postType = "article",
  onSave,
  isSaving,
}: PostEditorProps) {
  const { theme } = useTheme();
  const [title, setTitle] = useState(initialData.title);
  const [slug, setSlug] = useState(initialData.slug);
  const [contentMdx, setContentMdx] = useState(initialData.contentMdx);
  const [cover, setCover] = useState<MediaFileResponse | null>(
    initialData.coverMedia || null
  );
  const [category, setCategory] = useState<string>(
    initialData.categoryId || "none"
  );
  const [activeTab, setActiveTab] = useState("edit");

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
            {title || "未命名文章"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            存为草稿
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({
                title,
                slug,
                contentMdx,
                cover_media_id: cover?.id || null,
                category_id: category === "none" ? null : category,
              })
            }
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" /> 发布文章
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
                  onChange={(val) => setContentMdx(val || "")}
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
        <div className="space-y-6 overflow-y-auto pb-8 pr-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <SettingsIcon className="size-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">
                文章设置
              </h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-xs">
                URL 别名 (Slug)
              </Label>
              <Input
                id="slug"
                placeholder="my-post-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">所属分类</Label>
              <CategorySelect
                postType={postType as PostType}
                value={category}
                onValueChange={setCategory}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">封面图片</Label>
              <CoverSelect currentCover={cover} onCoverChange={setCover} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
