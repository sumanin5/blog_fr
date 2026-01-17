import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyPosts,
  listPostsByType,
  deletePostByType,
  createPostByType,
  updatePostByType,
  getPostById,
  PostType,
} from "@/shared/api/generated";
import { toast } from "sonner";
import { POST_TYPE_LABELS } from "@/shared/constants/posts";

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

  return useMutation({
    mutationFn: (data: {
      title: string;
      slug: string;
      contentMdx: string;
      cover_media_id?: string | null;
      category_id?: string | null;
    }) =>
      createPostByType({
        path: { post_type: postType },
        body: {
          title: data.title,
          slug: data.slug || undefined,
          content_mdx: data.contentMdx,
          post_type: postType,
          status: "draft",
          cover_media_id: data.cover_media_id,
          category_id: data.category_id,
        },
      }),
    onSuccess: () => {
      const label = POST_TYPE_LABELS[postType];
      toast.success(`${label}创建成功！已存为草稿。`);
      queryClient.invalidateQueries({ queryKey: ["posts", "me", postType] });
    },
    onError: (error: any) => {
      toast.error("创建失败: " + (error.message || "未知错误"));
    },
  });
}

/**
 * 更新文章
 */
export function useUpdatePost(id: string, postType: PostType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      slug: string;
      contentMdx: string;
      cover_media_id?: string | null;
      category_id?: string | null;
    }) =>
      updatePostByType({
        path: { post_id: id, post_type: postType },
        body: {
          title: data.title,
          slug: data.slug,
          content_mdx: data.contentMdx,
          cover_media_id: data.cover_media_id,
          category_id: data.category_id,
        },
      }),
    onSuccess: () => {
      toast.success("更新成功！");
      queryClient.invalidateQueries({ queryKey: ["posts", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["posts", "me", postType] });
    },
    onError: (error: any) => {
      toast.error("更新失败: " + (error.message || "未知错误"));
    },
  });
}

/**
 * 删除文章的操作钩子
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; type: PostType }) =>
      deletePostByType({
        path: {
          post_type: variables.type,
          post_id: variables.id,
        },
      }),
    onSuccess: (_, variables) => {
      toast.success("内容已删除");
      // 刷新相关列表
      queryClient.invalidateQueries({
        queryKey: ["posts", "me", variables.type],
      });
      queryClient.invalidateQueries({ queryKey: ["posts", "all"] });
    },
    onError: (error: any) => {
      toast.error("删除失败", {
        description: error.message || "未知错误",
      });
    },
  });
}
