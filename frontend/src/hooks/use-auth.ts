"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  login as apiLogin,
  registerUser as apiRegister,
  getCurrentUserInfo,
  type BodyLogin,
  type UserRegister as RawUserRegister,
} from "@/shared/api";
import type { User, UserLogin, UserRegister } from "@/shared/api/types";
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
 * 获取当前用户信息 (优雅降级模式)
 * 逻辑：有 Token 就探测身份，报错(401/500等)统统视为“游客”
 */
async function fetchCurrentUser(): Promise<User | null> {
  const token = Cookies.get("access_token");
  if (!token) return null;

  // 使用默认探测模式，不显式抛出异常
  const response = await getCurrentUserInfo();

  if (response.error) {
    return null;
  }

  // 强转为高保真驼峰模型
  return response.data as unknown as User;
}

/**
 * 核心 Auth Hook
 */
export function useAuth() {
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
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // 2. 登录 Mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: UserLogin) => {
      const response = await apiLogin({
        // 安全断言：Camel -> Unknown -> Snake (BodyLogin)
        body: credentials as unknown as BodyLogin,
        throwOnError: true,
      });

      const { access_token } = response.data || {};
      if (access_token) {
        localStorage.setItem("access_token", access_token);
        Cookies.set("access_token", access_token, {
          expires: 7,
          path: "/",
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
    onError: (error) => toast.error(error.message),
  });

  // 3. 注册 Mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: UserRegister) => {
      return await apiRegister({
        // 安全断言：Camel -> Unknown -> Snake (RawUserRegister)
        body: userData as unknown as RawUserRegister,
        throwOnError: true,
      });
    },
    onSuccess: () => toast.success("注册成功！请登录"),
    onError: (error) => toast.error(error.message),
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
