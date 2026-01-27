import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCategoryByType,
  updateCategoryByType,
  deleteCategoryByType,
} from "@/shared/api";
import {
  PostType,
  CategoryCreate as DomainCategoryCreate,
  CategoryUpdate as DomainCategoryUpdate,
} from "@/shared/api/types";
import type {
  CreateCategoryByTypeData,
  UpdateCategoryByTypeData,
  DeleteCategoryByTypeData,
} from "@/shared/api/generated/types.gen";
import {
  revalidateCategories,
  revalidatePosts,
} from "@/app/actions/revalidate";
import { toSnakeCase } from "@/shared/api/helpers";

import { toast } from "sonner";

/**
 * 分类管理相关的变动操作 (Mutations)
 */
export const useCategoryMutations = (postType: PostType) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
  };

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: DomainCategoryCreate) => {
      const snakeCaseData = toSnakeCase(data);
      return createCategoryByType({
        path: {
          post_type: postType,
        } as unknown as CreateCategoryByTypeData["path"],
        body: snakeCaseData as unknown as CreateCategoryByTypeData["body"],
        throwOnError: true,
      });
    },
    onSuccess: async () => {
      invalidate();
      await revalidateCategories();
      toast.success("分类创建成功");
    },
    onError: (err: Error) => {
      toast.error(`创建失败: ${err.message || "未知错误"}`);
    },
  });

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DomainCategoryUpdate }) => {
      const snakeCaseData = toSnakeCase(data);
      return updateCategoryByType({
        path: {
          post_type: postType,
          category_id: id,
        } as unknown as UpdateCategoryByTypeData["path"],
        body: snakeCaseData as unknown as UpdateCategoryByTypeData["body"],
        throwOnError: true,
      });
    },
    onSuccess: async () => {
      invalidate();
      await revalidateCategories();
      await revalidatePosts(); // 文章列表可能展示分类名，故需刷新
      toast.success("分类更新成功");
    },
    onError: (err: Error) => {
      toast.error(`更新失败: ${err.message || "未知错误"}`);
    },
  });

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteCategoryByType({
        path: {
          post_type: postType,
          category_id: id,
        } as unknown as DeleteCategoryByTypeData["path"],
        throwOnError: true,
      }),
    onSuccess: async () => {
      invalidate();
      await revalidateCategories();
      await revalidatePosts();
      toast.success("分类已成功移除");
    },
    onError: (err: Error) => {
      toast.error(`删除失败: ${err.message || "该分类下可能仍有关联内容"}`);
    },
  });

  return {
    createCategory: (
      data: DomainCategoryCreate,
      options?: Parameters<typeof createMutation.mutate>[1],
    ) => createMutation.mutate(data, options),
    updateCategory: (
      args: { id: string; data: DomainCategoryUpdate },
      options?: Parameters<typeof updateMutation.mutate>[1],
    ) => updateMutation.mutate(args, options),
    deleteCategory: (
      id: string,
      options?: Parameters<typeof deleteMutation.mutate>[1],
    ) => deleteMutation.mutate(id, options),
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
};
