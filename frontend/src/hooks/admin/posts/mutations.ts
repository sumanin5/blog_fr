import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPostByType,
  updatePostByType,
  deletePostByType,
  PostCreate,
  PostUpdate,
} from "@/shared/api/generated";
// 将领域模型重命名，避免与生成的 Raw 类型冲突
import {
  PostType,
  PostCreate as DomainPostCreate,
  PostUpdate as DomainPostUpdate,
} from "@/shared/api/types";
import { toast } from "sonner";

/**
 * 文章管理相关的变动操作 (Mutations)
 */
export const usePostMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  // 创建文章
  const createMutation = useMutation({
    mutationFn: ({ type, data }: { type: PostType; data: DomainPostCreate }) =>
      createPostByType({
        path: { post_type: type },
        // 我们通过 unknown 中转告诉 TS，数据在运行时会被拦截器处理
        body: data as unknown as PostCreate,
        throwOnError: true,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("文章发布成功！正在处理后台同步...");
    },
    onError: (err: Error) => {
      toast.error(`发布失败: ${err.message || "请检查输入格式"}`);
    },
  });

  // 更新文章
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
      type,
    }: {
      id: string;
      data: DomainPostUpdate;
      type: PostType;
    }) =>
      updatePostByType({
        // ✅ 显式 Path 映射
        path: { post_type: type, post_id: id },
        body: data as unknown as PostUpdate,
        throwOnError: true,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("内容已安全保存");
    },
    onError: (err: Error) => {
      toast.error(`保存失败: ${err.message}`);
    },
  });

  // 删除文章
  const deleteMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: PostType }) =>
      deletePostByType({
        path: { post_type: type, post_id: id },
        throwOnError: true,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("文章已从库中移除");
    },
    onError: (err: Error) => {
      toast.error(`删除失败: ${err.message}`);
    },
  });

  return {
    createPost: (
      args: { type: PostType; data: DomainPostCreate },
      options?: Parameters<typeof createMutation.mutate>[1],
    ) => createMutation.mutate(args, options),
    updatePost: (
      args: { id: string; data: DomainPostUpdate; type: PostType },
      options?: Parameters<typeof updateMutation.mutate>[1],
    ) => updateMutation.mutate(args, options),
    deletePost: (
      args: { id: string; type: PostType },
      options?: Parameters<typeof deleteMutation.mutate>[1],
    ) => deleteMutation.mutate(args, options),
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
};
