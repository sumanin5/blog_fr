"use client";

import React from "react";
import { PostType } from "@/shared/api/generated";
import { Category, CategoryCreate, CategoryUpdate } from "@/shared/api/types";
import { RefreshCw, Plus, Loader2, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const handleSave = (data: Omit<CategoryCreate, "postType">) => {
    const onSuccess = () => setEditOpen(false);

    if (editingItem) {
      updateCategory(
        { id: editingItem.id, data: data as unknown as CategoryUpdate },
        { onSuccess },
      );
    } else {
      createCategory(
        { ...(data as unknown as CategoryCreate), postType: activeTab },
        { onSuccess },
      );
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
          <p className="max-w-prose text-muted-foreground text-sm">
            分类只修改数据库，不会创建、移动或删除 Git 目录和 index.md。Git
            来源分类的修改可能被后续同步覆盖。
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

      <Alert>
        <Info />
        <AlertTitle>Git 单向同步边界</AlertTitle>
        <AlertDescription>
          Git 是分类 index.md 的来源。后台改名、排序或删除只影响数据库；删除分类不会删除 Git
          目录，全量同步可能重新导入分类。
        </AlertDescription>
      </Alert>

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
