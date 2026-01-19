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
import { TagSelect } from "./tag-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MdxClientRenderer } from "@/components/post/content/renderers/mdx-client-renderer";
import {
  PostType,
  CategoryResponse,
  TagResponse,
} from "@/shared/api/generated";
import type { PostStatus } from "@/shared/api/generated";

import { CoverSelect } from "@/components/admin/media/cover-select";

// 本地定义状态常量，因为生成的代码中 PostStatus 只是 Type Alias
const POST_STATUS = {
  DRAFT: "draft" as PostStatus,
  PUBLISHED: "published" as PostStatus,
  ARCHIVED: "archived" as PostStatus,
};

import type { MediaFileResponse } from "@/hooks/use-media";

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
  initialData,
  postType = "article",
  categories,
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

  // New states
  const [status, setStatus] = useState<PostStatus>(
    initialData.status || POST_STATUS.DRAFT
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialData.tags || []
  );
  const [isFeatured, setIsFeatured] = useState(initialData.isFeatured || false);
  const [enableJsx, setEnableJsx] = useState(initialData.enableJsx || false);
  const [useServerRendering, setUseServerRendering] = useState(
    initialData.useServerRendering || false
  );
  const [excerpt, setExcerpt] = useState(initialData.excerpt || "");

  const handleSave = () => {
    onSave({
      title,
      slug,
      contentMdx,
      cover_media_id: cover?.id || null,
      category_id: category === "none" ? null : category,
      status,
      tags: selectedTags,
      is_featured: isFeatured,
      enable_jsx: enableJsx,
      use_server_rendering: useServerRendering,
      excerpt: excerpt || null,
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
            {title || "未命名文章"}
          </h2>
          <div
            className={`px-2 py-0.5 rounded text-xs border ${
              status === POST_STATUS.PUBLISHED
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
            }`}
          >
            {status === POST_STATUS.PUBLISHED ? "已发布" : "草稿"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status !== POST_STATUS.PUBLISHED && (
            <Button variant="outline" size="sm" onClick={handleSave}>
              存为草稿
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />{" "}
            {status === POST_STATUS.PUBLISHED ? "更新文章" : "发布文章"}
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
          {/* 基本设置 */}
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
              <Label className="text-xs">出版状态</Label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as PostStatus)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={POST_STATUS.DRAFT}>
                    草稿 (Draft)
                  </SelectItem>
                  <SelectItem value={POST_STATUS.PUBLISHED}>
                    发布 (Published)
                  </SelectItem>
                  <SelectItem value={POST_STATUS.ARCHIVED}>
                    归档 (Archived)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">所属分类</Label>
              <CategorySelect
                postType={postType as PostType}
                value={category}
                onValueChange={setCategory}
                categories={categories}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">文章标签</Label>
              <TagSelect
                selectedTags={selectedTags}
                onValueChange={setSelectedTags}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">封面图片</Label>
              <CoverSelect currentCover={cover} onCoverChange={setCover} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">摘要 (Excerpt)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="输入文章摘要..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
              />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* 高级设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
              高级设置
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs">精选文章</Label>
                <p className="text-[10px] text-muted-foreground">
                  置顶显示在首页
                </p>
              </div>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs">启用 JSX</Label>
                <p className="text-[10px] text-muted-foreground">
                  支持 React 组件渲染
                </p>
              </div>
              <Switch checked={enableJsx} onCheckedChange={setEnableJsx} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs">服务端渲染</Label>
                <p className="text-[10px] text-muted-foreground">
                  从服务器预编译 MDX
                </p>
              </div>
              <Switch
                checked={useServerRendering}
                onCheckedChange={setUseServerRendering}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
