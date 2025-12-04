# React 前端 API 集成指南

> 本文档基于 `openapi.json` API 规范，指导如何在 React 前端项目中设计和实现 API 请求逻辑。

---

## 目录

1. [API 概览](#1-api-概览)
2. [前端项目结构规划](#2-前端项目结构规划)
3. [第一步：安装必要依赖](#3-第一步安装必要依赖)
4. [第二步：创建 API 服务层](#4-第二步创建-api-服务层)
5. [第三步：创建 TypeScript 类型定义](#5-第三步创建-typescript-类型定义)
6. [第四步：实现认证状态管理](#6-第四步实现认证状态管理)
7. [第五步：创建功能页面](#7-第五步创建功能页面)
8. [第六步：路由配置](#8-第六步路由配置)
9. [最佳实践与注意事项](#9-最佳实践与注意事项)

---

## 1. API 概览

根据 `openapi.json`，后端提供以下 **用户相关 API**：

| 方法     | 路径               | 功能                       | 认证          |
| -------- | ------------------ | -------------------------- | ------------- |
| `POST`   | `/users/register`  | 注册新用户                 | ❌ 不需要     |
| `POST`   | `/users/login`     | 用户登录                   | ❌ 不需要     |
| `GET`    | `/users/me`        | 获取当前用户信息           | ✅ 需要 Token |
| `PUT`    | `/users/me`        | 更新当前用户信息           | ✅ 需要 Token |
| `DELETE` | `/users/me`        | 删除当前用户               | ✅ 需要 Token |
| `GET`    | `/users/`          | 获取用户列表（管理员）     | ✅ 需要 Token |
| `GET`    | `/users/{user_id}` | 获取指定用户信息（管理员） | ✅ 需要 Token |
| `PUT`    | `/users/{user_id}` | 更新指定用户信息（管理员） | ✅ 需要 Token |
| `DELETE` | `/users/{user_id}` | 删除指定用户（管理员）     | ✅ 需要 Token |

### 认证方式

- **类型**: OAuth2 Password Bearer
- **Token URL**: `/users/login`
- **请求头格式**: `Authorization: Bearer <access_token>`

---

## 2. 前端项目结构规划

基于当前项目结构，建议按以下方式组织代码：

```
frontend/src/
├── api/                    # 🆕 API 服务层
│   ├── client.ts           # Axios 实例配置
│   ├── auth.ts             # 认证相关 API
│   └── users.ts            # 用户相关 API
├── types/                  # 🆕 TypeScript 类型定义
│   └── user.ts             # 用户相关类型
├── hooks/                  # 🆕 自定义 Hooks
│   ├── useAuth.ts          # 认证 Hook
│   └── useUser.ts          # 用户数据 Hook
├── contexts/               # 🆕 React Context
│   └── AuthContext.tsx     # 认证状态管理
├── pages/                  # 页面组件
│   ├── Home.tsx
│   ├── About.tsx
│   ├── Dashboard.tsx
│   ├── auth/               # 🆕 认证页面
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   └── users/              # 🆕 用户管理页面
│       ├── Profile.tsx     # 个人信息页
│       └── UserList.tsx    # 用户列表（管理员）
├── components/             # 可复用组件
│   └── ui/
├── Layout.tsx
├── App.tsx
└── main.tsx
```

---

## 3. 第一步：安装必要依赖

在开始之前，你需要安装 HTTP 请求库。推荐使用 **Axios**：

```bash
cd frontend
npm install axios
```

**为什么选择 Axios？**

- 自动转换 JSON 数据
- 支持请求/响应拦截器（非常适合处理 Token）
- 更好的错误处理
- 支持请求取消

---

## 4. 第二步：创建 API 服务层

### 4.1 创建 Axios 实例 (`src/api/client.ts`)

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// 创建 Axios 实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器：自动添加 Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：处理常见错误
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token 过期或无效，清除本地存储并跳转登录页
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**设计要点：**

- 使用环境变量 `VITE_API_URL` 配置 API 基础地址
- 请求拦截器自动从 `localStorage` 读取并添加 Token
- 响应拦截器统一处理 401 未授权错误

### 4.2 创建认证 API (`src/api/auth.ts`)

```typescript
import apiClient from "./client";
import type {
  UserRegister,
  UserResponse,
  LoginCredentials,
  TokenResponse,
} from "@/types/user";

export const authApi = {
  // 用户注册
  register: async (data: UserRegister): Promise<UserResponse> => {
    const response = await apiClient.post<UserResponse>(
      "/users/register",
      data
    );
    return response.data;
  },

  // 用户登录（注意：登录使用 form-urlencoded 格式）
  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await apiClient.post<TokenResponse>(
      "/users/login",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data;
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await apiClient.get<UserResponse>("/users/me");
    return response.data;
  },
};
```

**⚠️ 重要提示：**
登录接口使用 `application/x-www-form-urlencoded` 而非 JSON！这是 OAuth2 Password Bearer 的标准格式。

### 4.3 创建用户 API (`src/api/users.ts`)

```typescript
import apiClient from "./client";
import type { UserResponse, UserUpdate, UserListResponse } from "@/types/user";

export const usersApi = {
  // 更新当前用户信息
  updateCurrentUser: async (data: UserUpdate): Promise<UserResponse> => {
    const response = await apiClient.put<UserResponse>("/users/me", data);
    return response.data;
  },

  // 删除当前用户账号
  deleteCurrentUser: async (): Promise<void> => {
    await apiClient.delete("/users/me");
  },

  // 获取用户列表（管理员）
  getUsers: async (params?: {
    skip?: number;
    limit?: number;
    is_active?: boolean;
  }): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>("/users/", {
      params,
    });
    return response.data;
  },

  // 获取指定用户信息（管理员）
  getUserById: async (userId: string): Promise<UserResponse> => {
    const response = await apiClient.get<UserResponse>(`/users/${userId}`);
    return response.data;
  },

  // 更新指定用户信息（管理员）
  updateUserById: async (
    userId: string,
    data: UserUpdate
  ): Promise<UserResponse> => {
    const response = await apiClient.put<UserResponse>(
      `/users/${userId}`,
      data
    );
    return response.data;
  },

  // 删除指定用户（管理员）
  deleteUserById: async (userId: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}`);
  },
};
```

---

## 5. 第三步：创建 TypeScript 类型定义

创建 `src/types/user.ts`：

```typescript
// 用户角色枚举
export type UserRole = "user" | "admin" | "superadmin";

// 用户注册请求
export interface UserRegister {
  username: string; // 必填，3-50字符
  email: string; // 必填，邮箱格式
  password: string; // 必填，6-100字符
  full_name?: string; // 可选，最多100字符
  bio?: string; // 可选，最多500字符
  avatar?: string; // 可选，URL格式
}

// 登录凭证
export interface LoginCredentials {
  username: string;
  password: string;
}

// Token 响应（根据实际后端返回调整）
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// 用户响应
export interface UserResponse {
  id: string; // UUID
  username: string;
  email: string;
  is_active: boolean;
  role: UserRole;
  full_name?: string;
  bio?: string;
  avatar?: string;
  created_at: string; // ISO 日期字符串
  updated_at: string;
  last_login?: string;
}

// 用户更新请求（所有字段可选）
export interface UserUpdate {
  username?: string;
  email?: string;
  password?: string;
  is_active?: boolean;
  role?: UserRole;
  full_name?: string;
  bio?: string;
  avatar?: string;
}

// 用户列表响应
export interface UserListResponse {
  total: number;
  users: UserResponse[];
}

// API 错误响应
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationError[];
}
```

---

## 6. 第四步：实现认证状态管理

使用 React Context 管理全局认证状态。

### 6.1 创建 AuthContext (`src/contexts/AuthContext.tsx`)

```typescript
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authApi } from "@/api/auth";
import type {
  UserResponse,
  LoginCredentials,
  UserRegister,
} from "@/types/user";

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: UserRegister) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 页面加载时检查登录状态
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    const tokenData = await authApi.login(credentials);
    localStorage.setItem("access_token", tokenData.access_token);
    await refreshUser();
  };

  const register = async (data: UserRegister) => {
    await authApi.register(data);
    // 注册成功后可以选择自动登录
    // await login({ username: data.username, password: data.password });
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// 自定义 Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

### 6.2 在 main.tsx 中包裹 AuthProvider

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
```

---

## 7. 第五步：创建功能页面

### 7.1 登录页面 (`src/pages/auth/Login.tsx`)

```typescript
import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ username, password });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "登录失败，请检查用户名和密码");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">用户登录</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">用户名或邮箱</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          还没有账号？
          <Link to="/register" className="text-blue-500 hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### 7.2 注册页面 (`src/pages/auth/Register.tsx`)

```typescript
import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // 验证密码匹配
    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    // 验证密码长度
    if (formData.password.length < 6) {
      setError("密码至少需要6个字符");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name || undefined,
      });
      navigate("/login", { state: { message: "注册成功，请登录" } });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(", "));
      } else {
        setError(detail || "注册失败，请稍后重试");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">注册账号</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">用户名 *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={3}
              maxLength={50}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">邮箱 *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">全名（可选）</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">密码 *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={6}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">确认密码 *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "注册中..." : "注册"}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          已有账号？
          <Link to="/login" className="text-blue-500 hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### 7.3 个人资料页面 (`src/pages/users/Profile.tsx`)

```typescript
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi } from "@/api/users";

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    bio: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        full_name: user.full_name || "",
        bio: user.bio || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      await usersApi.updateCurrentUser({
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name || undefined,
        bio: formData.bio || undefined,
      });
      await refreshUser();
      setIsEditing(false);
      setMessage({ type: "success", text: "个人信息更新成功！" });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "更新失败",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("确定要删除账号吗？此操作不可撤销！")) return;

    try {
      await usersApi.deleteCurrentUser();
      logout();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "删除失败",
      });
    }
  };

  if (!user) return <div>加载中...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">个人资料</h1>

      {message.text && (
        <div
          className={`p-3 rounded mb-4 ${
            message.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        {/* 用户基本信息 */}
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt="头像"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              user.username[0].toUpperCase()
            )}
          </div>
          <div className="ml-4">
            <div className="text-lg font-semibold">{user.username}</div>
            <div className="text-gray-500">{user.role}</div>
          </div>
        </div>

        {/* 表单 */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">用户名</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              />
            ) : (
              <div className="text-gray-900">{user.username}</div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-1">邮箱</label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              />
            ) : (
              <div className="text-gray-900">{user.email}</div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-1">全名</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              />
            ) : (
              <div className="text-gray-900">{user.full_name || "未设置"}</div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-1">个人简介</label>
            {isEditing ? (
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                rows={3}
              />
            ) : (
              <div className="text-gray-900">{user.bio || "未设置"}</div>
            )}
          </div>

          {/* 只读信息 */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-gray-500 text-sm">账号状态</label>
              <div
                className={user.is_active ? "text-green-600" : "text-red-600"}
              >
                {user.is_active ? "已激活" : "未激活"}
              </div>
            </div>
            <div>
              <label className="block text-gray-500 text-sm">注册时间</label>
              <div>{new Date(user.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 mt-6 pt-6 border-t">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                取消
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              编辑资料
            </button>
          )}

          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ml-auto"
          >
            删除账号
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 8. 第六步：路由配置

更新 `App.tsx` 添加新路由：

```typescript
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// 页面
import Home from "@/pages/Home";
import About from "@/pages/About";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Profile from "@/pages/users/Profile";
import Layout from "@/Layout";

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">加载中...</div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公开路由（无需登录） */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 需要布局的路由 */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />

          {/* 受保护的路由（需要登录） */}
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 页面 */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## 9. 最佳实践与注意事项

### 9.1 安全性

1. **永远不要在代码中硬编码 API URL**

   ```typescript
   // ❌ 错误
   const API_URL = "http://localhost:8000";

   // ✅ 正确 - 使用环境变量
   const API_URL = import.meta.env.VITE_API_URL;
   ```

2. **创建 `.env` 文件**

   ```env
   VITE_API_URL=http://localhost:8000
   ```

3. **Token 存储考虑**
   - `localStorage`: 简单但易受 XSS 攻击
   - `httpOnly Cookie`: 更安全，需要后端配合

### 9.2 错误处理

```typescript
// 创建统一的错误处理工具
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg).join(", ");
    }
    return error.message;
  }
  return "未知错误";
}
```

### 9.3 加载状态 UI

推荐使用骨架屏或加载指示器提升用户体验：

```typescript
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

### 9.4 开发流程建议

1. **先完成认证模块** → Login, Register, AuthContext
2. **测试 API 连接** → 确保能正常登录获取 Token
3. **逐步添加功能页面** → Profile → UserList (管理员)
4. **优化 UI/UX** → 添加加载状态、错误提示、表单验证

### 9.5 推荐的学习资源

- [Axios 官方文档](https://axios-http.com/)
- [React Router v6 文档](https://reactrouter.com/)
- [React Context 详解](https://react.dev/learn/passing-data-deeply-with-context)

---

## 快速开始清单

按以下顺序创建文件：

- [ ] 1. `npm install axios`
- [ ] 2. 创建 `src/types/user.ts`
- [ ] 3. 创建 `src/api/client.ts`
- [ ] 4. 创建 `src/api/auth.ts`
- [ ] 5. 创建 `src/api/users.ts`
- [ ] 6. 创建 `src/contexts/AuthContext.tsx`
- [ ] 7. 修改 `src/main.tsx` 添加 AuthProvider
- [ ] 8. 创建 `src/pages/auth/Login.tsx`
- [ ] 9. 创建 `src/pages/auth/Register.tsx`
- [ ] 10. 创建 `src/pages/users/Profile.tsx`
- [ ] 11. 更新 `src/App.tsx` 路由配置

---

_文档创建时间: 2025-12-04_
_基于 OpenAPI 3.1.0 规范_
