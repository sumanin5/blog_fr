"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCategoriesByType,
  deleteCategoryByType,
  PostType,
  createCategoryByType,
  updateCategoryByType,
  CategoryResponse,
} from "@/shared/api/generated";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Plus,
  FolderTree,
  Trash2,
  Edit2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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

export default function CategoriesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<PostType>("article");

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] =
    React.useState<CategoryResponse | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    name: "",
    slug: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "categories", activeTab],
    queryFn: () =>
      listCategoriesByType({
        path: { post_type: activeTab },
        throwOnError: true,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      createCategoryByType({
        path: { post_type: activeTab },
        body: { ...data, post_type: activeTab },
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("分类创建成功");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error("创建失败：" + (err as any).message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData & { id: string }) =>
      updateCategoryByType({
        path: { post_type: activeTab, category_id: data.id },
        body: data,
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("分类更新成功");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error("更新失败：" + (err as any).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteCategoryByType({
        path: { post_type: activeTab, category_id: id },
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("分类已删除");
    },
    onError: () => toast.error("删除失败，可能该分类下仍有文章"),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      sort_order: 0,
      is_active: true,
    });
    setEditingCategory(null);
  };

  const handleEdit = (category: CategoryResponse) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      sort_order: category.sort_order || 0,
      is_active: category.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({ ...formData, id: editingCategory.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (user?.role !== "superadmin") {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive opacity-50" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">权限不足</h2>
          <p className="text-muted-foreground">
            分类运维功能仅对超级管理员开放。
          </p>
        </div>
      </div>
    );
  }

  const categories = data?.data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">分类运维</h1>
          <p className="text-muted-foreground">
            管理全站文章和想法的分类层级。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            刷新
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> 新增分类
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="article"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PostType)}
      >
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="article">文章分类 (Article)</TabsTrigger>
          <TabsTrigger value="idea">想法分类 (Idea)</TabsTrigger>
        </TabsList>

        <div className="mt-6 rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[300px]">名称</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    正在加载...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    暂无分类
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cat.parent_id && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground/50 ml-2" />
                        )}
                        <FolderTree className="h-4 w-4 text-primary/60" />
                        <span className="font-medium">{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {cat.slug}
                    </TableCell>
                    <TableCell>{cat.sort_order}</TableCell>
                    <TableCell>
                      <Badge variant={cat.is_active ? "default" : "secondary"}>
                        {cat.is_active ? "已启用" : "停用"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(cat)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("确定要删除此分类吗？")) {
                            deleteMutation.mutate(cat.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "编辑分类" : "新增分类"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? "修改现有分类信息" : "创建一个新的内容分类"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">分类名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL 别名 (Slug)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">排序权重</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sort_order: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                数字越小排序越靠前
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">启用状态</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCategory ? "保存修改" : "立即创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
