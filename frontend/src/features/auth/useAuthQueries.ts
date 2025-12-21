import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authQueryKeys } from "./query-keys";
import {
  loginUser,
  registerNewUser,
  fetchCurrentUser,
  updateUserProfile,
} from "./auth-api";
import type { BodyLogin } from "@/shared/api";

/**
 * 获取当前用户信息的 Query Hook
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: authQueryKeys.currentUser(),
    queryFn: fetchCurrentUser,
    // 只有存在 token 时才启用查询
    enabled: !!localStorage.getItem("access_token"),
    // 用户信息相对稳定，可以设置较长的 staleTime
    staleTime: 5 * 60 * 1000, // 5 分钟
    // 失败时不自动重试（避免无效 token 重复请求）
    retry: false,
  });
};

/**
 * 登录 Mutation Hook
 */
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: BodyLogin) => {
      const { access_token } = await loginUser(credentials);
      localStorage.setItem("access_token", access_token);
      return access_token;
    },
    onSuccess: () => {
      // 登录成功后，重新获取用户信息
      queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser() });
    },
    onError: (error) => {
      console.error("Login failed:", error);
      // 登录失败时清除可能存在的无效 token
      localStorage.removeItem("access_token");
    },
  });
};

/**
 * 注册 Mutation Hook
 */
export const useRegister = () => {
  return useMutation({
    mutationFn: registerNewUser,
    onError: (error) => {
      console.error("Register failed:", error);
    },
  });
};

/**
 * 更新用户信息 Mutation Hook
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      // 更新成功后，重新获取用户信息
      queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser() });
    },
    onError: (error) => {
      console.error("Update user info failed:", error);
    },
  });
};

/**
 * 登出功能（不是 mutation，因为不需要 API 调用）
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return () => {
    // 清除本地存储
    localStorage.removeItem("access_token");

    // 清除所有用户相关的查询缓存
    queryClient.removeQueries({ queryKey: authQueryKeys.all });

    // 可选：重置到未认证状态
    queryClient.setQueryData(authQueryKeys.currentUser(), null);
  };
};
