"use client";

import { Settings as SettingsIcon, Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CategorySelect } from "./category-select";
import { TagSelect } from "./tag-select";
import { CoverSelect } from "@/components/admin/media/uploader/cover-select";

import { PostType, PostStatus } from "@/shared/api/generated";
import type { MediaFile, Category } from "@/shared/api/types";

// 1. 定义统一的元数据接口
export interface PostMetadata {
  slug: string;
  status: PostStatus;
  categoryId: string;
  tags: string[];
  cover: MediaFile | null;
  excerpt: string;
  isFeatured: boolean;
  enableJsx: boolean;
  useServerRendering: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

interface PostMetadataSidebarProps {
  postType: "article" | "idea";
  categories: Category[];
  // 2. 合并为一个数据对象
  metadata: PostMetadata;
  // 3. 合并为一个变更回调
  onChange: (newMetadata: PostMetadata) => void;
}

export function PostMetadataSidebar({
  postType,
  categories,
  metadata,
  onChange,
}: PostMetadataSidebarProps) {
  // 辅助函数：只更新变更的字段
  const updateField = (changes: Partial<PostMetadata>) => {
    onChange({ ...metadata, ...changes });
  };

  return (
    <div className="space-y-6 overflow-y-auto pb-8 pr-2 h-full scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40 transition-colors">
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
            value={metadata.slug}
            onChange={(e) => updateField({ slug: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">出版状态</Label>
          <Select
            value={metadata.status}
            onValueChange={(val) => updateField({ status: val as PostStatus })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">草稿 (Draft)</SelectItem>
              <SelectItem value="published">发布 (Published)</SelectItem>
              <SelectItem value="archived">归档 (Archived)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">所属分类</Label>
          <CategorySelect
            postType={postType as PostType}
            value={metadata.categoryId}
            onValueChange={(val) => updateField({ categoryId: val })}
            categories={categories}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">文章标签</Label>
          <TagSelect
            selectedTags={metadata.tags}
            onValueChange={(tags) => updateField({ tags })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">封面图片</Label>
          <CoverSelect
            currentCover={metadata.cover}
            onCoverChange={(cover) => updateField({ cover })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">摘要 (Excerpt)</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="输入文章摘要..."
            value={metadata.excerpt}
            onChange={(e) => updateField({ excerpt: e.target.value })}
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
            <p className="text-[10px] text-muted-foreground">置顶显示在首页</p>
          </div>
          <Switch
            checked={metadata.isFeatured}
            onCheckedChange={(checked) => updateField({ isFeatured: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-xs">启用 JSX</Label>
            <p className="text-[10px] text-muted-foreground">
              支持 React 组件渲染
            </p>
          </div>
          <Switch
            checked={metadata.enableJsx}
            onCheckedChange={(checked) => updateField({ enableJsx: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-xs">服务端渲染</Label>
            <p className="text-[10px] text-muted-foreground">
              从服务器预编译 MDX
            </p>
          </div>
          <Switch
            checked={metadata.useServerRendering}
            onCheckedChange={(checked) =>
              updateField({ useServerRendering: checked })
            }
          />
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* SEO 设置 */}
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-2 text-primary">
          <Globe className="size-4" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            SEO 设置
          </h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="metaTitle" className="text-xs">
            SEO 标题 (Meta Title)
          </Label>
          <Input
            id="metaTitle"
            placeholder="如果不填则默认为文章标题"
            value={metadata.metaTitle}
            onChange={(e) => updateField({ metaTitle: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="metaDescription" className="text-xs">
            SEO 描述 (Meta Description)
          </Label>
          <textarea
            id="metaDescription"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="简短的描述以提高搜索点击率..."
            value={metadata.metaDescription}
            onChange={(e) => updateField({ metaDescription: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="metaKeywords" className="text-xs">
            SEO 关键词 (Meta Keywords)
          </Label>
          <Input
            id="metaKeywords"
            placeholder="关键词，以英文逗号分隔"
            value={metadata.metaKeywords}
            onChange={(e) => updateField({ metaKeywords: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
