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
import {
  revalidatePosts,
  revalidatePost,
  revalidateAll,
} from "@/app/actions/revalidate";

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
        body: data as unknown as PostCreate,
        throwOnError: true,
      }),
    onSuccess: async () => {
      invalidate();
      // Server Action: 刷新列表缓存
      await revalidatePosts();
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
        path: { post_type: type, post_id: id },
        body: data as unknown as PostUpdate,
        throwOnError: true,
      }),
    onSuccess: async (data, variables) => {
      invalidate();
      // Server Action: 刷新特定文章和列表
      // 尝试从返回数据获取 slug，如果还没有生成（理论上更新后会有），则尝试用变量
      const slug = data.data?.slug || variables.data.slug;
      if (slug) {
        await revalidatePost(slug);
      } else {
        await revalidatePosts();
      }
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
    onSuccess: async () => {
      invalidate();
      await revalidateAll(); // 删除可能影响分类统计等，索性全刷
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
    ) => createMutation.mutateAsync(args, options),
    updatePost: (
      args: { id: string; data: DomainPostUpdate; type: PostType },
      options?: Parameters<typeof updateMutation.mutate>[1],
    ) => updateMutation.mutateAsync(args, options),
    deletePost: (
      args: { id: string; type: PostType },
      options?: Parameters<typeof deleteMutation.mutate>[1],
    ) => deleteMutation.mutateAsync(args, options),
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
};
