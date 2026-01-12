"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  login as apiLogin,
  registerUser as apiRegister,
  getCurrentUserInfo,
  type BodyLogin,
  type UserRegister,
  type UserResponse,
} from "@/shared/api";

/**
 * Auth 相关的查询键
 */
export const authKeys = {
  all: ["auth"] as const,
  currentUser: () => [...authKeys.all, "current-user"] as const,
};

/**
 * 获取当前用户信息 (Real Implementation)
 */
async function fetchCurrentUser(): Promise<UserResponse | null> {
  // 检查本地存储中的访问令牌
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (!token) return null;

  // 尝试获取当前用户信息
  try {
    const response = await getCurrentUserInfo({ throwOnError: true });
    return response.data ?? null;
    // 如果获取失败，则移除访问令牌
  } catch {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    return null;
  }
}

/**
 * 核心 Auth Hook
 */
export function useAuth() {
  // 获取 Query Client
  const queryClient = useQueryClient();

  // 1. 获取用户信息
  const {
    data: user,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 分钟
    retry: false,
  });

  // 2. 登录 Mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: BodyLogin) => {
      const response = await apiLogin({
        body: credentials,
        throwOnError: true,
      });
      if (response.data?.access_token) {
        localStorage.setItem("access_token", response.data.access_token);
        return response.data;
      }
      throw new Error("Login failed: No token received");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });

  // 3. 注册 Mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: UserRegister) => {
      return await apiRegister({
        body: userData,
        throwOnError: true,
      });
    },
  });

  // 4. 登出
  const logout = async () => {
    localStorage.removeItem("access_token");
    queryClient.setQueryData(authKeys.currentUser(), null);
    queryClient.removeQueries({ queryKey: authKeys.all });
  };

  return {
    user,
    isLoading: isLoading || isFetching,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    logout,
    refetch,
  };
}
