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
import {
  FolderTree,
  Eye,
  FileText,
  LayoutTemplate,
  ArrowUpDown,
} from "lucide-react";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MdxClientRenderer } from "@/components/public/post/content/renderers/mdx-client-renderer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaSelectField } from "@/components/admin/media/fields/media-select-field";
import type { MediaFile } from "@/shared/api/types";
import { Category, CategoryCreate } from "@/shared/api/types";

interface CategoryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSave: (data: CategoryCreate) => void | Promise<void>;
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
    icon: MediaFile | null;
    excerpt: string;
    postSortOrder: NonNullable<CategoryCreate["postSortOrder"]>;
  }>({
    name: "",
    slug: "",
    description: "",

    sortOrder: 0,
    isActive: true,
    isFeatured: false,
    iconPreset: "",
    coverMedia: null,
    icon: null,
    excerpt: "",
    postSortOrder: "published_at_desc",
  });

  // 当编辑对象变化时，填充表单
  React.useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        sortOrder: category.sortOrder ?? 0,
        isActive: category.isActive ?? true,
        isFeatured: category.isFeatured ?? false,
        iconPreset: category.iconPreset ?? "",
        coverMedia: category.coverMedia ?? null,
        icon: category.icon ?? null,
        excerpt: category.excerpt ?? "",
        postSortOrder: category.postSortOrder ?? "published_at_desc",
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
        icon: null,
        excerpt: "",
        postSortOrder: "published_at_desc",
      });
    }
    setActiveTab("edit");
  }, [category, open]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    // 构造提交数据，将 coverMedia 转换为 ID
    const { coverMedia, icon, ...fields } = formData;
    const submitData: CategoryCreate = {
      ...fields,
      coverMediaId: coverMedia?.id ?? null,
      iconId: icon?.id ?? null,
      iconPreset: fields.iconPreset || null,
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
              <DialogTitle>
                {category
                  ? `编辑分类 (${category.postType || "未知板块"})`
                  : "新增分类"}
              </DialogTitle>
              <DialogDescription>
                配置分类的元数据、外观以及详细描述信息
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {/* ... Content remains same ... */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* ... */}
              {/* (All internal form content is preserved, just wrapping tag changed) */}

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
                      // Remove 'required' browser validation dependency since we are manual now
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
                  <MediaSelectField
                    variant="cover"
                    value={formData.coverMedia}
                    onChange={(file) =>
                      setFormData({ ...formData, coverMedia: file })
                    }
                    libraryFilter={{
                      mediaType: "image",
                      // Allow all images, not just those strictly tagged as 'cover'
                    }}
                  />
                </div>

                {/* 图标设置 (SVG 优先) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>分类图标</Label>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      SVG / Emoji
                    </span>
                  </div>

                  <div className="flex gap-4">
                    {/* SVG 选择器 */}
                    <div className="shrink-0">
                      <MediaSelectField
                        variant="icon"
                        label="SVG ICON"
                        value={formData.icon}
                        onChange={(file) =>
                          setFormData({ ...formData, icon: file })
                        }
                        accept="image/svg+xml"
                        libraryFilter={{ mimeType: "image/svg+xml" }}
                        className="size-24"
                      />
                    </div>

                    {/* Emoji 输入框 (作为 Fallback) */}
                    <div className="flex-1 space-y-2">
                      <Label
                        htmlFor="edit-icon"
                        className="text-xs text-muted-foreground"
                      >
                        Emoji 备选
                      </Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xl select-none pointer-events-none">
                          {formData.iconPreset || "📂"}
                        </div>
                        <Input
                          id="edit-icon"
                          value={formData.iconPreset}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              iconPreset: e.target.value,
                            })
                          }
                          placeholder="Emoji"
                          className="pl-12"
                          maxLength={2}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        若未设置 SVG 图标，将显示此 Emoji。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border my-4" />

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

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="edit-post-sort">文章列表排序</Label>
                      <ArrowUpDown className="size-3 text-muted-foreground" />
                    </div>
                    <Select
                      value={formData.postSortOrder}
                      onValueChange={(value) => {
                        if (value === "published_at_desc" || value === "published_at_asc" || value === "title_asc" || value === "title_desc") {
                          setFormData({ ...formData, postSortOrder: value });
                        }
                      }}
                    >
                      <SelectTrigger id="edit-post-sort" className="w-full">
                        <SelectValue placeholder="选择排序方式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published_at_desc">
                          发布时间 (最新在前)
                        </SelectItem>
                        <SelectItem value="published_at_asc">
                          发布时间 (最旧在前)
                        </SelectItem>
                        <SelectItem value="title_asc">
                          标题 (A {"->"} Z)
                        </SelectItem>
                        <SelectItem value="title_desc">
                          标题 (Z {"->"} A)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      * 该分类下文章列表的默认排序列
                    </p>
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
              type="button" // Changed from submit to button
              onClick={(e) => handleSubmit(e)} // Trigger handler manually
              isLoading={isPending}
              loadingText="保存中"
              icon={LayoutTemplate}
            >
              {category ? "保存分类修改" : "创建新分类"}
            </AdminActionButton>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
