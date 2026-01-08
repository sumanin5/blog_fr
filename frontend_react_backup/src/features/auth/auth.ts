import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  login as apiLogin,
  registerUser,
  getCurrentUserInfo,
  updateCurrentUserInfo,
} from "@/shared/api";
import type {
  UserResponse,
  UserRegister,
  UserUpdate,
  BodyLogin,
} from "@/shared/api";

import { createQueryKeyFactory } from "@/shared/lib/query-key-factory";

// ============================================
// 查询键管理
// ============================================
const factoryKeys = createQueryKeyFactory("auth");

export const authQueryKeys = {
  ...factoryKeys,
  currentUser: () => [...factoryKeys.all, "current-user"] as const,
};

// ============================================
// API 调用层
// ============================================

/**
 * 用户登录
 */
export const loginUser = async (
  credentials: BodyLogin,
): Promise<{ access_token: string }> => {
  const response = await apiLogin({ body: credentials, throwOnError: true });

  if (!response.data?.access_token) {
    throw new Error("登录失败：未收到访问令牌");
  }

  return {
    access_token: response.data.access_token,
  };
};

/**
 * 用户注册
 */
export const registerNewUser = async (
  userData: UserRegister,
): Promise<void> => {
  await registerUser({ body: userData, throwOnError: true });
};

/**
 * 获取当前用户信息
 */
export const fetchCurrentUser = async (): Promise<UserResponse | null> => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    return null;
  }

  try {
    const response = await getCurrentUserInfo({ throwOnError: true });
    return response.data ?? null;
  } catch (error) {
    // Token 无效，清除本地存储
    localStorage.removeItem("access_token");
    throw error;
  }
};

/**
 * 更新当前用户信息
 */
export const updateUserProfile = async (
  userData: UserUpdate,
): Promise<void> => {
  await updateCurrentUserInfo({ body: userData, throwOnError: true });
};

// ============================================
// TanStack Query Hooks
// ============================================

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
