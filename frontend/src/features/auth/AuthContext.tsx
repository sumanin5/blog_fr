import { createContext, type ReactNode } from "react";

import type {
  UserResponse,
  UserRegister,
  UserUpdate,
  BodyLogin,
} from "@/shared/api";
import {
  useCurrentUser,
  useLogin,
  useRegister,
  useUpdateUser,
  useLogout,
} from "./useAuthQueries";

interface AuthContextType {
  user: UserResponse | null; // 当前登录用户
  isLoading: boolean; // 是否正在加载
  isAuthenticated: boolean; // 是否已登录
  login: (data: BodyLogin) => Promise<void>; // 登录
  register: (data: UserRegister) => Promise<void>; // 注册
  logout: () => void; // 登出
  refreshUser: () => void; // 刷新当前用户信息
  updateUser: (data: UserUpdate) => Promise<void>; // 更新当前用户信息
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // 使用 TanStack Query hooks
  const { data: user, isLoading, refetch } = useCurrentUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const updateUserMutation = useUpdateUser();
  const logout = useLogout();

  const handleLogin = async (data: BodyLogin) => {
    await loginMutation.mutateAsync(data);
  };

  const handleRegister = async (data: UserRegister) => {
    await registerMutation.mutateAsync(data);
  };

  const handleUpdateUser = async (data: UserUpdate) => {
    await updateUserMutation.mutateAsync(data);
  };

  const handleRefreshUser = () => {
    refetch();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        login: handleLogin,
        register: handleRegister,
        logout,
        refreshUser: handleRefreshUser,
        updateUser: handleUpdateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 导出 Context 供 useAuth hook 使用
export { AuthContext };
