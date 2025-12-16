
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import {
  login as apiLogin,
  registerUser,
  getCurrentUserInfo,
  updateCurrentUserInfo,
} from "@/shared/api";
import type { UserResponse, UserRegister, UserUpdate, BodyLogin } from "@/shared/api";

interface AuthContextType {
  user: UserResponse | null; // 当前登录用户
  isLoading: boolean; // 是否正在加载
  isAuthenticated: boolean; // 是否已登录
  login: (data: BodyLogin) => Promise<void>; // 登录
  register: (data: UserRegister) => Promise<void>; // 注册
  logout: () => void; // 登出
  refreshUser: () => Promise<void>; // 刷新当前用户信息
  updateUser: (data: UserUpdate) => Promise<void>; // 更新当前用户信息
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        /* 没有token，表示未登录 */
        setIsLoading(false);
        return;
      }

      /* 有token，表示已登录 */
      try {
        /* 获取当前用户信息 */
        const response = await getCurrentUserInfo({ throwOnError: true });
        setUser(response.data ?? null); // 设置当前用户，注意可能为null
      } catch {
        /* 获取当前用户信息失败，表示token无效 */
        localStorage.removeItem("access_token");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const refreshUser = async () => {
    try {
      const response = await getCurrentUserInfo({ throwOnError: true });
      setUser(response.data ?? null);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
    }
  };

  const login = async (data: BodyLogin) => {
    try {
      /* 登录 - 明确设置 throwOnError: true 确保网络错误被抛出 */
      const response = await apiLogin({ body: data, throwOnError: true });
      //   const tokenData = response.data as {
      //     access_token: string;
      //     token_type: string;
      //   };

      //   localStorage.setItem("access_token", tokenData.access_token);
      //   localStorage.setItem("token_type", tokenData.token_type);
      localStorage.setItem("access_token", response.data?.access_token ?? "");
      /* 登录成功，获取当前用户信息 */
      await refreshUser();
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const register = async (data: UserRegister) => {
    try {
      await registerUser({ body: data, throwOnError: true });
      // 注册成功后不会返回 token，需要用户手动登录
      // 或者自动登录：
      // await login({ username: data.username, password: data.password });
    } catch (error) {
      console.error("Register failed:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
  };

  const updateUser = async (data: UserUpdate) => {
    try {
      await updateCurrentUserInfo({ body: data, throwOnError: true });
      await refreshUser();
    } catch (error) {
      console.error("Update user info failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
