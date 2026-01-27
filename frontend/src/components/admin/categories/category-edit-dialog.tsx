"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FolderTree, Eye, FileText, LayoutTemplate } from "lucide-react";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MdxClientRenderer } from "@/components/post/content/renderers/mdx-client-renderer";
import { CoverSelect } from "@/components/admin/media/uploader/cover-select";
import type { MediaFile } from "@/shared/api/types";
import { CategoryResponse } from "@/shared/api/generated";

interface CategoryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryResponse | null;
  onSave: (data: any) => void | Promise<void>;
  isPending: boolean;
}

export function CategoryEditDialog({
  open,
  onOpenChange,
  category,
  onSave,
  isPending,
}: CategoryEditDialogProps) {
  const [activeTab, setActiveTab] = React.useState("edit");
  const [formData, setFormData] = React.useState<{
    name: string;
    slug: string;
    description: string;
    sortOrder: number;
    isActive: boolean;
    isFeatured: boolean;
    iconPreset: string;
    coverMedia: MediaFile | null;
    excerpt: string;
  }>({
    name: "",
    slug: "",
    description: "",

    sortOrder: 0,
    isActive: true,
    isFeatured: false,
    iconPreset: "",
    coverMedia: null,
    excerpt: "",
  });

  // 当编辑对象变化时，填充表单
  React.useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        sortOrder: category.sort_order ?? 0,
        isActive: category.is_active ?? true,
        isFeatured: (category as any).is_featured ?? false,
        iconPreset: category.icon_preset ?? "",
        coverMedia: (category as any).cover_media ?? null,
        excerpt: (category as any).excerpt ?? "",
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        sortOrder: 0,
        isActive: true,
        isFeatured: false,
        iconPreset: "",
        coverMedia: null,
        excerpt: "",
      });
    }
    setActiveTab("edit");
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 构造提交数据，将 coverMedia 转换为 ID
    const submitData = {
      ...formData,
      cover_media_id: formData.coverMedia?.id || null,
      icon_preset: formData.iconPreset || null,
      is_featured: formData.isFeatured,
      excerpt: formData.excerpt,
    };
    await onSave(submitData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FolderTree className="size-5" />
            </div>
            <div>
              <DialogTitle>{category ? "编辑分类" : "新增分类"}</DialogTitle>
              <DialogDescription>
                配置分类的元数据、外观以及详细描述信息
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* 左侧：主要内容 (8列) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">分类名称</Label>
                    <Input
                      id="edit-name"
                      placeholder="例如：技术分享"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-slug">URL 别名 (Slug)</Label>
                    <Input
                      id="edit-slug"
                      placeholder="tech-sharing"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      required
                      className="font-mono"
                    />
                  </div>
                </div>

                {/* 摘要编辑区域 */}
                <div className="space-y-2">
                  <Label htmlFor="edit-excerpt">摘要 (Excerpt)</Label>
                  <textarea
                    id="edit-excerpt"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="简短的分类介绍，用于卡片展示..."
                    value={formData.excerpt}
                    onChange={(e) =>
                      setFormData({ ...formData, excerpt: e.target.value })
                    }
                    maxLength={100}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    * 限制 100 字符以内，将显示在首页卡片上
                  </p>
                </div>

                {/* 描述编辑区域 */}
                <div className="space-y-2">
                  <Label>详细描述 (Markdown)</Label>
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full border rounded-md"
                  >
                    <TabsList className="w-full justify-start rounded-b-none border-b bg-muted/40 p-0 h-10">
                      <TabsTrigger
                        value="edit"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background px-4 py-2 h-10 gap-2"
                      >
                        <FileText className="size-3.5" /> 编辑
                      </TabsTrigger>
                      <TabsTrigger
                        value="preview"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background px-4 py-2 h-10 gap-2"
                      >
                        <Eye className="size-3.5" /> 预览
                      </TabsTrigger>
                    </TabsList>

                    <div className="bg-background min-h-[300px]">
                      <TabsContent value="edit" className="m-0 h-full">
                        <textarea
                          className="w-full h-[300px] p-4 text-sm font-mono resize-none focus:outline-none bg-transparent leading-relaxed"
                          placeholder="# 这是一个一级标题&#10;&#10;在这里以此支持 Markdown 格式编写分类的详细介绍..."
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                        />
                      </TabsContent>
                      <TabsContent
                        value="preview"
                        className="m-0 h-[300px] overflow-y-auto p-4 bg-muted/10"
                      >
                        {formData.description ? (
                          <MdxClientRenderer
                            mdx={formData.description}
                            toc={[]}
                            articleClassName="prose prose-sm dark:prose-invert max-w-none"
                          />
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            暂无内容预览
                          </div>
                        )}
                      </TabsContent>
                    </div>
                  </Tabs>
                  <p className="text-[10px] text-muted-foreground">
                    * 支持标准 Markdown 语法，描述内容将显示在分类归档页的头部。
                  </p>
                </div>
              </div>

              {/* 右侧：媒体与设置 (4列) */}
              <div className="lg:col-span-4 space-y-6">
                {/* 封面图 */}
                <div className="space-y-3">
                  <Label>封面图片</Label>
                  <div className="rounded-lg border border-dashed p-1">
                    <CoverSelect
                      currentCover={formData.coverMedia}
                      onCoverChange={(cover) =>
                        setFormData({ ...formData, coverMedia: cover })
                      }
                    />
                  </div>
                </div>

                {/* 图标预设 */}
                <div className="space-y-2">
                  <Label htmlFor="edit-icon">图标 (Emoji)</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xl select-none pointer-events-none">
                      {formData.iconPreset || "📂"}
                    </div>
                    <Input
                      id="edit-icon"
                      value={formData.iconPreset}
                      onChange={(e) =>
                        setFormData({ ...formData, iconPreset: e.target.value })
                      }
                      placeholder="输入 Emoji，如 💻"
                      className="pl-12"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="h-px bg-border my-4" />

                {/* 排序与状态 */}
                {/* 排序与状态 */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-sort">排序权重</Label>
                    <Input
                      id="edit-sort"
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <Label>启用状态</Label>
                      <div className="text-[10px] text-muted-foreground">
                        {formData.isActive ? "在前台可见" : "暂时隐藏"}
                      </div>
                    </div>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <Label>首页推荐</Label>
                      <div className="text-[10px] text-muted-foreground">
                        {formData.isFeatured ? "在首页轮播" : "普通显示"}
                      </div>
                    </div>
                    <Switch
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isFeatured: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-muted/10 gap-2">
            <AdminActionButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </AdminActionButton>
            <AdminActionButton
              type="submit"
              isLoading={isPending}
              loadingText="保存中"
              icon={LayoutTemplate}
            >
              {category ? "保存分类修改" : "创建新分类"}
            </AdminActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
