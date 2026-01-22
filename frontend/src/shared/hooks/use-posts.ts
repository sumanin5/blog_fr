import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyPosts,
  listPostsByType,
  deletePostByType,
  createPostByType,
  updatePostByType,
  getPostById,
  PostType,
  PostCreate,
  PostUpdate,
} from "@/shared/api/generated";
import { toast } from "sonner";
import { usePostTypes } from "./use-post-types";

/**
 * 获取（超级管理员）全站文章列表
 */
export function useAllPosts(postType: PostType, enabled = true) {
  return useQuery({
    queryKey: ["posts", "all", postType],
    queryFn: async () => {
      const response = await listPostsByType({
        path: { post_type: postType },
        query: { status: null }, // 管理员查看所有状态
      });
      return response.data?.items || [];
    },
    enabled,
  });
}

/**
 * 获取我的文章列表
 */
export function useMyPosts(postType: PostType) {
  return useQuery({
    queryKey: ["posts", "me", postType],
    queryFn: async () => {
      const response = await getMyPosts({
        query: { post_type: postType },
      });
      return response.data?.items || [];
    },
  });
}

/**
 * 获取单篇文章详情（用于编辑）
 */
export function usePostDetail(id: string, postType: PostType) {
  return useQuery({
    queryKey: ["posts", "detail", id],
    queryFn: async () => {
      const response = await getPostById({
        path: { post_id: id, post_type: postType },
        query: { include_mdx: true },
      });
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * 创建文章
 */
export function useCreatePost(postType: PostType) {
  const queryClient = useQueryClient();
  const { data: postTypes = [] } = usePostTypes();

  return useMutation({
    mutationFn: (newPost: PostCreate) =>
      createPostByType({
        path: { post_type: postType },
        body: {
          ...newPost,
          post_type: postType,
          status: newPost.status || "draft",
        },
      }),
    onSuccess: () => {
      const typeInfo = postTypes?.find((t) => t.value === postType);
      const label = typeInfo?.label || postType;
      toast.success(`${label}创建成功！已存为草稿。`);
      queryClient.invalidateQueries({ queryKey: ["posts", "me", postType] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/**
 * 更新文章
 */
export function useUpdatePost(id: string, postType: PostType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PostUpdate) =>
      updatePostByType({
        path: { post_id: id, post_type: postType },
        body: data,
      }),
    onSuccess: () => {
      toast.success("更新成功！");
      queryClient.invalidateQueries({ queryKey: ["posts", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["posts", "me", postType] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/**
 * 删除文章的操作钩子
 */
export function useDeletePost() {
  const queryClient = useQueryClient();
  const { data: postTypes = [] } = usePostTypes();

  return useMutation({
    mutationFn: (variables: { id: string; type: PostType }) =>
      deletePostByType({
        path: {
          post_type: variables.type,
          post_id: variables.id,
        },
      }),
    onSuccess: (_, variables) => {
      const typeInfo = postTypes?.find((t) => t.value === variables.type);
      const label = typeInfo?.label || "内容";
      toast.success(`${label}已删除`);
      // 刷新相关列表
      queryClient.invalidateQueries({
        queryKey: ["posts", "me", variables.type],
      });
      queryClient.invalidateQueries({ queryKey: ["posts", "all"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
