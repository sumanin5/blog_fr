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
import { FolderTree } from "lucide-react";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import {
  CategoryResponse,
  CategoryCreate,
  CategoryUpdate,
} from "@/shared/api/generated";

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
  const [formData, setFormData] = React.useState({
    name: "",
    slug: "",
    description: "",
    sortOrder: 0,
    isActive: true,
  });

  // 当编辑对象变化时，填充表单
  React.useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        sortOrder: (category as any).sortOrder ?? 0,
        isActive: (category as any).isActive ?? true,
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        sortOrder: 0,
        isActive: true,
      });
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FolderTree className="size-5" />
            </div>
            <div>
              <DialogTitle>{category ? "编辑分类" : "新增分类"}</DialogTitle>
              <DialogDescription>
                {category ? "修改现有分类信息" : "创建一个新的内容分类"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">分类名称</Label>
              <Input
                id="edit-name"
                placeholder="例如：技术分享、生活随笔"
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
                placeholder="例如：tech-sharing"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                required
              />
              <p className="text-[10px] text-muted-foreground italic">
                * 修改 Slug 会触发物理目录重命名，请谨慎操作
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex flex-col justify-center gap-3 pt-2">
                <Label className="text-sm font-medium leading-none">
                  启用状态
                </Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {formData.isActive ? "已启用" : "已禁用"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t gap-2">
            <AdminActionButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
            >
              取消
            </AdminActionButton>
            <AdminActionButton
              type="submit"
              isLoading={isPending}
              loadingText="保存中"
              className="flex-1 sm:flex-none"
            >
              {category ? "保存修改" : "立即创建"}
            </AdminActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
