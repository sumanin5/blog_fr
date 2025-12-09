# React 前端 API 手动集成指南 (匠人模式)

> 🔨 **关于本指南**
> 本文档详细介绍了如何**纯手工**打造一个健壮的前端 API 层。
> 虽然现在有自动生成工具，但理解这个"手工打造"的过程对于掌握前端架构至关重要。这就像学习自动驾驶前，你必须先学会如何握住方向盘。

---

## 目录

1. [API 概览：我们的菜单](#1-api-概览我们的菜单)
2. [城市规划：项目结构](#2-城市规划项目结构)
3. [第一步：装备工具 (Axios)](#3-第一步装备工具-axios)
4. [第二步：建设基础设施 (API Layer)](#4-第二步建设基础设施-api-layer)
5. [第三步：制定法律契约 (TypeScript Types)](#5-第三步制定法律契约-typescript-types)
6. [第四步：建立广播系统 (Auth Context)](#6-第四步建立广播系统-auth-context)
7. [第五步：装修店面 (Pages)](#7-第五步装修店面-pages)
8. [第六步：交通管制 (Router)](#8-第六步交通管制-router)
9. [建筑规范 (最佳实践)](#9-建筑规范-最佳实践)

---

## 1. API 概览：我们的菜单

在开始烹饪（写代码）之前，我们需要先看看后厨（后端）提供了什么菜单（API）。
根据 `openapi.json`，后端为我们准备了以下**用户套餐**：

| 菜名 (功能) | 路径 (Path)       | 做法 (Method) | 价格 (认证) |
| ----------- | ----------------- | ------------- | ----------- |
| **注册**    | `/users/register` | `POST`        | 🆓 免费     |
| **登录**    | `/users/login`    | `POST`        | 🆓 免费     |
| **我是谁?** | `/users/me`       | `GET`         | 🎫 需门票   |
| **更新我**  | `/users/me`       | `PUT`         | 🎫 需门票   |
| **注销我**  | `/users/me`       | `DELETE`      | 🎫 需门票   |
| **查户口**  | `/users/`         | `GET`         | 👮 管理员   |
| **查某人**  | `/users/{id}`     | `GET`         | 👮 管理员   |

### 🎫 门票规则 (认证方式)

- **类型**: OAuth2 Password Bearer (一种标准的检票方式)
- **检票口**: `/users/login`
- **门票格式**: 你需要在请求头里大喊：`Authorization: Bearer <你的Token>`

---

## 2. 城市规划：项目结构

一个好的项目结构就像一个规划良好的城市，每个区域都有明确的职能，互不干扰。

```
frontend/src/
├── api/                    # � 【基础设施区】处理所有对外通信
│   ├── client.ts           # 总机房 (Axios 配置)
│   ├── auth.ts             # 签证中心 (登录注册)
│   └── users.ts            # 人口管理局 (用户增删改查)
├── types/                  # 📜 【档案馆】存放所有法律文件 (类型定义)
│   └── user.ts             # 用户档案格式定义
├── hooks/                  # � 【工具站】提供便捷的挂钩
│   ├── useAuth.ts          # 快速获取身份信息
│   └── useUser.ts          # 快速获取用户数据
├── contexts/               # 📡 【广播塔】全局状态管理
│   └── AuthContext.tsx     # 身份广播系统
├── pages/                  # 🏪 【商业区】用户直接看到的页面
│   ├── auth/               # 登录/注册大厅
│   └── users/              # 用户中心
├── components/             # 🧱 【建材市场】通用的砖块和组件
└── App.tsx                 # 🗺️ 【交通枢纽】路由配置
```

---

## 3. 第一步：装备工具 (Axios)

在开始建设之前，我们需要一把趁手的兵器来处理 HTTP 请求。**Axios** 就是前端界的"瑞士军刀"。

```bash
cd frontend
npm install axios
```

**为什么不直接用手 (fetch) 抓？**
虽然浏览器自带 `fetch`，但 Axios 就像给 `fetch` 穿上了钢铁侠战衣：

- **自动翻译**: 它能自动把 JSON 字符串变成 JS 对象，不用你手动 `JSON.parse`。
- **安检门 (拦截器)**: 可以在请求发出前和回来后自动进行检查（比如自动塞 Token）。
- **自带保镖**: 遇到 404 或 500 错误会自动报错，不用你手动检查 `ok` 状态。

---

## 4. 第二步：建设基础设施 (API Layer)

这一步我们要建立与后端通信的专用通道。

### 4.1 建设总机房 (`src/api/client.ts`)

这是所有请求的**必经之路**。我们在这里设置"关卡"，确保每个发出的请求都符合规范。

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// 1. 创建一个专属的 HTTP 客户端
// 就像是专门开通了一条通往后端的专线
const apiClient = axios.create({
  // 自动读取环境变量中的地址，开发环境默认为 localhost:8000
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  // 设置超时时间，防止请求"死等"
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. 设置【出发安检】(请求拦截器)
// 每个请求出发前，都要经过这里
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从口袋里(localStorage)掏出通行证(Token)
    const token = localStorage.getItem("access_token");
    if (token) {
      // 如果有证，就把它贴在请求头里
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. 设置【回程安检】(响应拦截器)
// 每个请求回来后，都要经过这里
apiClient.interceptors.response.use(
  (response) => response, // 如果一切正常，直接放行
  (error: AxiosError) => {
    // 如果被拦下了，且原因是 401 (未授权/票过期)
    if (error.response?.status === 401) {
      // 撕掉过期的票
      localStorage.removeItem("access_token");
      // 强制遣返到登录页
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 4.2 建设签证中心 (`src/api/auth.ts`)

这个文件专门处理"进出门"的业务。

```typescript
import apiClient from "./client";
import type {
  UserRegister,
  UserResponse,
  LoginCredentials,
  TokenResponse,
} from "@/types/user";

export const authApi = {
  // 📝 注册业务
  register: async (data: UserRegister): Promise<UserResponse> => {
    const response = await apiClient.post<UserResponse>(
      "/users/register",
      data
    );
    return response.data;
  },

  // 🔑 登录业务
  // 注意：这里有个特殊的规矩！
  // OAuth2 标准要求登录必须用 "表单格式" (form-urlencoded) 提交，
  // 而不是普通的 JSON。这就像去某些政府部门办事必须填纸质表格一样。
  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await apiClient.post<TokenResponse>(
      "/users/login",
      formData,
      {
        headers: {
          // 显式声明：我交的是表格，不是 JSON
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data;
  },

  // 👤 获取当前身份
  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await apiClient.get<UserResponse>("/users/me");
    return response.data;
  },
};
```

### 4.3 建设人口管理局 (`src/api/users.ts`)

这个文件处理所有关于"人"的操作。

```typescript
import apiClient from "./client";
import type { UserResponse, UserUpdate, UserListResponse } from "@/types/user";

export const usersApi = {
  // ✏️ 修改自己的档案
  updateCurrentUser: async (data: UserUpdate): Promise<UserResponse> => {
    const response = await apiClient.put<UserResponse>("/users/me", data);
    return response.data;
  },

  // 🗑️ 注销户口
  deleteCurrentUser: async (): Promise<void> => {
    await apiClient.delete("/users/me");
  },

  // 📋 查阅花名册 (管理员专用)
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

  // 🔍 调查特定人员 (管理员专用)
  getUserById: async (userId: string): Promise<UserResponse> => {
    const response = await apiClient.get<UserResponse>(`/users/${userId}`);
    return response.data;
  },

  // ✏️ 修改他人档案 (管理员专用)
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

  // 🗑️ 强制注销他人 (管理员专用)
  deleteUserById: async (userId: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}`);
  },
};
```

---

## 5. 第三步：制定法律契约 (TypeScript Types)

在 TypeScript 的世界里，**类型定义 (Interface/Type)** 就是法律契约。它规定了数据必须长什么样，多一个字段、少一个字段、类型不对，编译器都会立刻报警。

创建 `src/types/user.ts`，这是我们与后端达成的"协议"：

```typescript
// 🎭 角色定义：只能是这三种之一，写错编译器会打手板
export type UserRole = "user" | "admin" | "superadmin";

// 📝 注册表单契约
export interface UserRegister {
  username: string; // 必填，没名字怎么行
  email: string; // 必填，联系方式
  password: string; // 必填，钥匙
  full_name?: string; // 可选，不想说可以不说
  bio?: string; // 可选，个性签名
  avatar?: string; // 可选，头像
}

// 🔑 登录凭证契约
export interface LoginCredentials {
  username: string;
  password: string;
}

// 🎫 门票契约 (后端发给我们的票长这样)
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// 👤 用户档案契约 (后端返回的用户信息长这样)
export interface UserResponse {
  id: string; // 身份证号 (UUID)
  username: string;
  email: string;
  is_active: boolean; // 账号是否活着
  role: UserRole; // 身份
  full_name?: string;
  bio?: string;
  avatar?: string;
  created_at: string; // 出生日期
  updated_at: string;
  last_login?: string;
}

// ✏️ 更新请求契约 (所有字段都是可选的，想改哪个改哪个)
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

// 📋 列表响应契约
export interface UserListResponse {
  total: number; // 总人数
  users: UserResponse[]; // 一群人的数组
}

// 🚫 错误响应契约 (后端报错时会返回这个)
export interface ValidationError {
  loc: (string | number)[]; // 哪里错了
  msg: string; // 错哪了
  type: string; // 错误类型
}

export interface HTTPValidationError {
  detail: ValidationError[];
}
```

---

## 6. 第四步：建立广播系统 (Auth Context)

**Context** 是 React 的"全城广播系统"。
如果没有它，你想在"个人中心"页面知道当前是谁登录了，你得从最顶层一层层传下来，非常麻烦。
有了它，任何组件只要"订阅"这个广播，就能随时知道：**"现在是谁登录？"、"我登录了吗？"**。

### 6.1 搭建广播塔 (`src/contexts/AuthContext.tsx`)

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

// 定义广播内容的格式
interface AuthContextType {
  user: UserResponse | null; // 当前用户是谁？(没登录就是 null)
  isLoading: boolean; // 正在检查登录状态吗？
  isAuthenticated: boolean; // 是否已登录？(方便判断)
  login: (credentials: LoginCredentials) => Promise<void>; // 登录动作
  register: (data: UserRegister) => Promise<void>; // 注册动作
  logout: () => void; // 注销动作
  refreshUser: () => Promise<void>; // 刷新用户数据动作
}

// 创建频道
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 广播塔组件 (Provider)
// 它包裹住整个应用，向内部所有组件提供数据
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔄 初始化：应用一启动，先检查口袋里有没有票
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      // 有票，去后端问问这张票是谁的
      refreshUser().finally(() => setIsLoading(false));
    } else {
      // 没票，那就是没登录
      setIsLoading(false);
    }
  }, []);

  // 刷新用户数据
  const refreshUser = async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch {
      // 如果票是假的或过期的，扔掉它
      localStorage.removeItem("access_token");
      setUser(null);
    }
  };

  // 登录动作
  const login = async (credentials: LoginCredentials) => {
    // 1. 去后端换票
    const tokenData = await authApi.login(credentials);
    // 2. 把票揣兜里
    localStorage.setItem("access_token", tokenData.access_token);
    // 3. 查查这张票是谁的，并更新状态
    await refreshUser();
  };

  // 注册动作
  const register = async (data: UserRegister) => {
    await authApi.register(data);
    // 注册成功后可以选择自动登录
    // await login({ username: data.username, password: data.password });
  };

  // 注销动作
  const logout = () => {
    localStorage.removeItem("access_token"); // 撕票
    setUser(null); // 清空用户状态
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

// 📻 接收器 (Custom Hook)
// 组件想听广播，就调用这个 hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

### 6.2 启动广播塔 (`src/main.tsx`)

我们需要在应用的**最顶层**启动这个广播系统。

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* 把整个 App 包裹在 AuthProvider 里，这样所有页面都能接收到广播 */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
```

---

## 7. 第五步：装修店面 (Pages)

基础设施都建好了，现在开始装修用户真正看到的页面。

### 7.1 登录大厅 (`src/pages/auth/Login.tsx`)

这里是用户进入系统的第一站。

```typescript
import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  // 状态管理：记录用户输入
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 从广播里拿到 login 方法
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // 阻止表单默认提交刷新页面
    setError("");
    setIsLoading(true);

    try {
      // 调用广播里的登录方法
      await login({ username, password });
      // 登录成功，跳转到仪表盘
      navigate("/dashboard");
    } catch (err: any) {
      // 登录失败，显示后端返回的错误信息
      setError(err.response?.data?.detail || "登录失败，请检查用户名和密码");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">用户登录</h2>

        {/* 错误提示条 */}
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

### 7.2 注册大厅 (`src/pages/auth/Register.tsx`)

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

    // 🛡️ 前端先做第一轮检查
    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

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
      // 注册成功，带话跳转到登录页
      navigate("/login", { state: { message: "注册成功，请登录" } });
    } catch (err: any) {
      // 处理后端返回的详细错误（可能是数组）
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

### 7.3 个人资料室 (`src/pages/users/Profile.tsx`)

这是一个**受保护**的页面，只有登录后才能看到。

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

  // 当 user 数据变化时，同步到表单
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
      // 调用更新 API
      await usersApi.updateCurrentUser({
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name || undefined,
        bio: formData.bio || undefined,
      });
      // 更新成功后，刷新全局用户状态
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
      logout(); // 删号后自动注销
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

## 8. 第六步：交通管制 (Router)

最后，我们需要配置路由，决定哪些页面是公开的，哪些是需要"门票"的。

更新 `App.tsx`：

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

// 🛡️ 路由守卫组件
// 它的职责：检查你有没有登录
// - 如果正在检查中：显示 Loading
// - 如果没登录：踢回登录页
// - 如果登录了：放行
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
        {/* 🟢 绿灯区：公开路由（无需登录） */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 🟡 混合区：需要布局的路由 */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />

          {/* 🔴 红灯区：受保护的路由（必须登录） */}
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

        {/* 404 迷路区 */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## 9. 建筑规范 (最佳实践)

### 9.1 安全性：不要把钥匙藏在门口地毯下

1.  **URL 不要写死**
    ❌ `const API_URL = "http://localhost:8000";` (上线必挂)
    ✅ `const API_URL = import.meta.env.VITE_API_URL;` (灵活多变)

2.  **创建 `.env` 文件**
    告诉程序：开发环境的后端在哪里。

    ```env
    VITE_API_URL=http://localhost:8000
    ```

### 9.2 错误处理：优雅地告诉用户出错了

不要直接把 `Object Object` 甩给用户看。

```typescript
// 创建一个翻译官，把晦涩的错误对象变成人话
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

### 9.3 用户体验：别让用户干等

加个 Loading 动画，告诉用户"我在努力加载中"。

```typescript
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

---

## 🔨 匠人精神总结

通过手动编写这些代码，你现在应该明白了：

1.  **Axios** 是如何作为信使在前后端之间穿梭的。
2.  **Interceptors** 是如何像安检一样自动处理 Token 的。
3.  **Context** 是如何像广播一样让全局知道"我是谁"的。
4.  **Types** 是如何像法律一样约束数据格式的。

虽然自动生成工具能帮我们省去很多体力活，但理解这些底层逻辑，能让你在遇到问题时（比如 Token 刷新失败、权限控制失效）迅速定位病灶，成为真正的架构师。

---

_文档更新时间: 2025-12-04_
_基于 OpenAPI 3.1.0 规范_
