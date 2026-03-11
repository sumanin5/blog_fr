"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  login as apiLogin,
  registerUser as apiRegister,
  getCurrentUserInfo,
  refreshToken as apiRefreshToken,
} from "@/shared/api";
import type {
  User,
  UserLogin,
  UserRegister,
  Token as DomainToken,
} from "@/shared/api/types";
import type {
  LoginData,
  RegisterUserData as RawUserRegisterData,
} from "@/shared/api/generated/types.gen";
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
 * 解析 JWT 获取载荷
 */
function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * 获取当前用户信息 (优雅降级模式)
 * 逻辑：有 Token 就探测身份，报错(401/500等)统统视为“游客”
 */
async function fetchCurrentUser(): Promise<User | null> {
  let token = Cookies.get("access_token");
  if (!token) return null;

  // 检查 Token 是否需要刷新（小于3天）
  const decoded = parseJwt(token);
  if (decoded && decoded.exp) {
    const now = Date.now() / 1000;
    const timeLeft = decoded.exp - now;
    // 如果剩余时间小于 3 天 (3 * 24 * 3600 = 259200 秒)，则刷新 token
    if (timeLeft > 0 && timeLeft < 259200) {
      try {
        const refreshResponse = await apiRefreshToken({ throwOnError: true });
        const newTokenData = refreshResponse.data as unknown as DomainToken;
        if (newTokenData?.accessToken) {
          token = newTokenData.accessToken;
          localStorage.setItem("access_token", token);
          Cookies.set("access_token", token, {
            expires: 7, // 延长 7 天
            path: "/",
            sameSite: "lax",
          });
        }
      } catch (err) {
        console.error("Token 自动刷新失败:", err);
        // 如果刷新失败，且原 token 未完全过期，放行给后端的 getCurrentUserInfo 处理
      }
    }
  }

  try {
    const response = await getCurrentUserInfo({ throwOnError: true });
    // 强转为高保真驼峰模型
    return response.data as unknown as User;
  } catch {
    // 身份认证失败或过期
    return null;
  }
}

/**
 * 核心 Auth Hook
 * 遵循“全驼峰业务逻辑 + 自动化 API 转换”规范
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
        // ✅ 拦截器自动转换 camelCase -> snake_case
        body: credentials as unknown as LoginData["body"],
        throwOnError: true,
      });

      // 拦截器已将 access_token 转为 accessToken
      const data = response.data as unknown as DomainToken;
      const token = data?.accessToken;

      if (token) {
        // 保存到 localStorage 主要是为了页面刷新前的同步状态
        localStorage.setItem("access_token", token);
        // 保存到 Cookie 用于拦截器读取
        Cookies.set("access_token", token, {
          expires: 7,
          path: "/",
          sameSite: "lax",
        });
        return data;
      }
      throw new Error("登录异常：服务器未返回有效的身份凭证");
    },
    onSuccess: () => {
      toast.success("欢迎回来！");
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
    onError: (error: Error) => toast.error(`登录失败: ${error.message}`),
  });

  // 3. 注册 Mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: UserRegister) => {
      return await apiRegister({
        // ✅ 拦截器自动转换
        body: userData as unknown as RawUserRegisterData["body"],
        throwOnError: true,
      });
    },
    onSuccess: () => toast.success("注册成功！请登录以继续"),
    onError: (error: Error) => toast.error(`注册失败: ${error.message}`),
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
    login: (args: UserLogin) => loginMutation.mutateAsync(args),
    isLoggingIn: loginMutation.isPending,
    register: (args: UserRegister) => registerMutation.mutateAsync(args),
    isRegistering: registerMutation.isPending,
    logout,
    refetch,
  };
}
