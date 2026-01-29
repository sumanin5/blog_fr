"use client";

import React from "react";
import { PostType } from "@/shared/api/generated";
import { Category } from "@/shared/api/types";
import { RefreshCw, Plus, Loader2 } from "lucide-react";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// 新的通用组件和 Hook
import { AdminTable } from "@/components/admin/common/admin-table";
import { getCategoryColumns } from "@/components/admin/categories/category-columns";
import { useCategoriesAdmin } from "@/hooks/admin/categories";
import { CategoryEditDialog } from "@/components/admin/categories/category-edit-dialog";
import { CategoryDeleteDialog } from "@/components/admin/categories/category-delete-dialog";

export default function CategoriesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<PostType>("articles");

  // 1. 使用重构后的超级 Hook
  const {
    categories,
    isLoading,
    isFetching,
    refetch,
    isAuthorized,
    createCategory,
    updateCategory,
    deleteCategory,
    isPending: mutationPending,
  } = useCategoriesAdmin(activeTab);

  // UI 交互状态
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Category | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // 权限拦截
  React.useEffect(() => {
    if (!authLoading && user && !isAuthorized) {
      toast.error("权限不足，请联系系统管理员");
      router.push("/admin/dashboard");
    }
  }, [user, authLoading, isAuthorized, router]);

  // 处理保存 (新建或更新)
  const handleSave = (data: any) => {
    const onSuccess = () => setEditOpen(false);

    if (editingItem) {
      updateCategory({ id: editingItem.id, data }, { onSuccess });
    } else {
      createCategory({ ...data, postType: activeTab }, { onSuccess });
    }
  };

  // 表格列定义
  const columns = React.useMemo(
    () =>
      getCategoryColumns({
        onEdit: (cat) => {
          setEditingItem(cat as Category);
          setEditOpen(true);
        },
        onDelete: (id) => setDeletingId(id),
      }),
    [],
  );

  if (authLoading || (user && !isAuthorized)) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground italic">
            正在验证管理权限...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">分类运维</h1>
          <p className="text-muted-foreground text-sm">
            管理全站内容的分层结构。Slug 变更将自动触发物理资源重命名。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdminActionButton
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            icon={RefreshCw}
            className="h-9"
          >
            刷新
          </AdminActionButton>
          <AdminActionButton
            size="sm"
            onClick={() => {
              setEditingItem(null);
              setEditOpen(true);
            }}
            icon={Plus}
            className="h-9"
          >
            新增分类
          </AdminActionButton>
        </div>
      </div>

      {/* 切换面板 */}
      <Tabs
        defaultValue="articles"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PostType)}
        className="w-full"
      >
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger
            value="articles"
            className="px-8 flex items-center gap-2"
          >
            文章 (Article)
          </TabsTrigger>
          <TabsTrigger value="ideas" className="px-8 flex items-center gap-2">
            想法 (Idea)
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <AdminTable
            data={categories}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="当前板块暂无分类"
          />
        </div>
      </Tabs>

      {/* 所有的弹窗统一管理 */}
      <CategoryEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={editingItem}
        onSave={handleSave}
        isPending={mutationPending}
      />

      <CategoryDeleteDialog
        id={deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async (id) => {
          await deleteCategory(id);
          setDeletingId(null);
        }}
        isPending={mutationPending}
      />
    </div>
  );
}
