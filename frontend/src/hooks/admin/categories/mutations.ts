import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCategoryByType,
  updateCategoryByType,
  deleteCategoryByType,
  PostType,
  CategoryCreate,
  CategoryUpdate,
} from "@/shared/api/generated";
import { toast } from "sonner";

/**
 * 分类管理相关的变动操作 (Mutations)
 */
export const useCategoryMutations = (postType: PostType) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    // 同时刷新关联的文章信息
    queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
  };

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: CategoryCreate) =>
      createCategoryByType({
        path: { post_type: postType },
        body: data,
        throwOnError: true,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("分类创建成功");
    },
    onError: (err: any) => {
      toast.error(`创建失败: ${err.message || "未知错误"}`);
    },
  });

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryUpdate }) =>
      updateCategoryByType({
        path: { post_type: postType, category_id: id },
        body: data,
        throwOnError: true,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("分类更新成功");
    },
    onError: (err: any) => {
      toast.error(`更新失败: ${err.message || "未知错误"}`);
    },
  });

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteCategoryByType({
        path: { post_type: postType, category_id: id },
        throwOnError: true,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("分类已成功移除");
    },
    onError: (err: any) => {
      toast.error(`删除失败: ${err.message || "该分类下可能仍有关联内容"}`);
    },
  });

  return {
    createCategory: (data: CategoryCreate, options?: any) =>
      createMutation.mutate(data, options),
    updateCategory: (
      args: { id: string; data: CategoryUpdate },
      options?: any
    ) => updateMutation.mutate(args, options),
    deleteCategory: (id: string, options?: any) =>
      deleteMutation.mutate(id, options),
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
};
