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
import Cookies from "js-cookie";
import { toast } from "sonner";

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
  // 优先检查 Cookies 中的访问令牌
  const token = Cookies.get("access_token");
  if (!token) return null;

  const response = await getCurrentUserInfo({ throwOnError: true });
  return response.data ?? null;
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
        Cookies.set("access_token", response.data.access_token, {
          expires: 7, // 7 天后过期
          path: "/", // 全站生效
          sameSite: "lax",
        });
        return response.data;
      }
      throw new Error("登录异常：服务器未返回有效的身份凭证");
    },
    onSuccess: () => {
      toast.success("欢迎回来！");
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
    onError: (error) => {
      // error.message 已经自动变成了后端给的“用户不存在”或“密码错误”
      toast.error(error.message);
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
    onSuccess: () => {
      toast.success("注册成功！请使用您的新账号登录。");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 4. 登出
  const logout = async () => {
    localStorage.removeItem("access_token");
    Cookies.remove("access_token");
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
