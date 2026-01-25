import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPostByType,
  updatePostByType,
  deletePostByType,
  PostType,
  PostCreate,
  PostUpdate,
} from "@/shared/api/generated";
import { toast } from "sonner";

/**
 * 文章管理相关的变动操作 (Mutations)
 */
export const usePostMutations = (postType?: PostType) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
    // 如果是公开文章的变更，可能还需要刷新前台缓存
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  // 创建文章
  const createMutation = useMutation({
    mutationFn: ({ type, data }: { type: PostType; data: PostCreate }) =>
      createPostByType({
        path: { post_type: type },
        body: data,
        throwOnError: true,
      }),
    onSuccess: (res) => {
      invalidate();
      toast.success("文章发布成功！正在处理后台同步...");
    },
    onError: (err: any) => {
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
      data: PostUpdate;
      type: PostType;
    }) =>
      updatePostByType({
        path: { post_type: type, post_id: id },
        body: data,
        throwOnError: true,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("内容已安全保存");
    },
    onError: (err: any) => {
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
    onError: (err: any) => {
      toast.error(`删除失败: ${err.message}`);
    },
  });

  return {
    createPost: (args: { type: PostType; data: PostCreate }, options?: any) =>
      createMutation.mutate(args, options),
    updatePost: (
      args: { id: string; data: PostUpdate; type: PostType },
      options?: any
    ) => updateMutation.mutate(args, options),
    deletePost: (args: { id: string; type: PostType }, options?: any) =>
      deleteMutation.mutate(args, options),
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
};
