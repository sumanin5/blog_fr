"use client";

import React from "react";
import {
  Save,
  Eye,
  Settings as SettingsIcon,
  FileText,
  ChevronLeft,
  Layout,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PostEditorProps {
  initialData?: {
    title: string;
    slug: string;
    contentMdx: string;
  };
  onSave: (data: { title: string; slug: string; contentMdx: string }) => void;
  isSaving?: boolean;
}

export function PostEditor({ initialData, onSave, isSaving }: PostEditorProps) {
  const [title, setTitle] = React.useState(initialData?.title || "");
  const [slug, setSlug] = React.useState(initialData?.slug || "");
  const [contentMdx, setContentMdx] = React.useState(
    initialData?.contentMdx || ""
  );
  const [activeTab, setActiveTab] = React.useState("edit");
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [previewReady, setPreviewReady] = React.useState(false);

  // 监听预览页面的就绪消息
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PREVIEW_READY") {
        setPreviewReady(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // 当 MDX 内容改变或切换到预览标签时，通知预览 iframe
  React.useEffect(() => {
    if (activeTab === "preview" && previewReady && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        {
          type: "MDX_PREVIEW",
          content: contentMdx,
        },
        "*"
      );
    }
  }, [contentMdx, activeTab, previewReady]);

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/posts/me">
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
            onClick={() => onSave({ title, slug, contentMdx })}
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
              <textarea
                value={contentMdx}
                onChange={(e) => setContentMdx(e.target.value)}
                placeholder="使用 Markdown 开始你的创作..."
                className="h-full w-full resize-none rounded-md border bg-muted/20 p-4 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </TabsContent>

            <TabsContent
              value="preview"
              className="flex-1 mt-4 border rounded-md overflow-hidden bg-white dark:bg-slate-950"
            >
              <iframe
                ref={iframeRef}
                src="/posts/preview"
                className="h-full w-full border-0"
                title="MDX Preview"
              />
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
              <select className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">选择分类...</option>
                <option value="tech">技术</option>
                <option value="life">生活</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">封面图片</Label>
              <div className="flex aspect-video items-center justify-center rounded-md border-2 border-dashed border-muted text-muted-foreground hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all">
                <Layout className="size-6 mr-2 opacity-20" />
                <span className="text-xs">点击上传封面</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
