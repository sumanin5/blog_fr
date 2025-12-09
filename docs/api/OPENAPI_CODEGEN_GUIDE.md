# OpenAPI 代码自动生成指南

> 本文档介绍如何使用 `@hey-api/openapi-ts` 根据 OpenAPI 规范自动生成 TypeScript API 客户端代码。

---

## 目录

1. [什么是 OpenAPI 代码生成](#1-什么是-openapi-代码生成)
2. [这种方法的优势](#2-这种方法的优势)
3. [工作原理](#3-工作原理)
4. [文件清单：手动 vs 自动生成](#4-文件清单手动-vs-自动生成)
5. [配置步骤详解](#5-配置步骤详解)
6. [生成文件结构说明](#6-生成文件结构说明)
7. [如何使用生成的代码](#7-如何使用生成的代码)
8. [日常开发流程](#8-日常开发流程)
9. [常见问题](#9-常见问题)

---

## 1. 什么是 OpenAPI 代码生成

### OpenAPI 规范

**OpenAPI**（原 Swagger）是一种用于描述 RESTful API 的标准规范。FastAPI 框架会自动生成符合 OpenAPI 3.x 规范的 JSON 文档，通常可以通过 `/openapi.json` 或 `/docs` 访问。

### 代码生成

**代码生成** 是指根据 OpenAPI 规范文档，自动生成客户端代码，包括：

- **TypeScript 类型定义** - 请求/响应的数据结构
- **API 调用函数** - 封装好的 HTTP 请求方法
- **错误类型** - 可能的错误响应类型

这意味着你不需要手动编写这些代码，工具会帮你完成！

---

## 2. 这种方法的优势

| 优势                    | 说明                                                    |
| ----------------------- | ------------------------------------------------------- |
| ✅ **类型安全**         | 所有 API 调用都有完整的 TypeScript 类型，编辑器自动提示 |
| ✅ **前后端一致**       | 类型直接从后端 OpenAPI 生成，保证一致性                 |
| ✅ **减少手写代码**     | 不需要手动定义类型和 API 函数                           |
| ✅ **自动更新**         | 后端 API 变更后，重新生成即可同步                       |
| ✅ **中文注释**         | FastAPI 的 docstring 会自动转为 JSDoc 注释              |
| ✅ **正确处理请求格式** | 自动识别 JSON、form-urlencoded 等格式                   |
| ✅ **内置认证支持**     | 自动处理 Bearer Token 等认证方式                        |

### 与手写代码的对比

```
手写代码流程：
后端 API → 手动阅读文档 → 手动定义类型 → 手动写请求函数 → 容易出错

自动生成流程：
后端 API → 导出 openapi.json → 运行生成命令 → 直接使用 ✅
```

---

## 3. 工作原理

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  FastAPI 后端   │ ──▶ │   openapi.json   │ ──▶ │  生成的代码      │
│  (Python)       │     │   (OpenAPI 规范)  │     │  (TypeScript)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   定义路由和模型          描述 API 结构           类型 + SDK 函数
   (@app.post)            (JSON 格式)            (可直接调用)
```

### 关键转换

| 后端 Python                     | OpenAPI JSON                       | 前端 TypeScript                    |
| ------------------------------- | ---------------------------------- | ---------------------------------- |
| `class UserRegister(BaseModel)` | `components/schemas/UserRegister`  | `export type UserRegister = {...}` |
| `@app.post("/users/register")`  | `paths["/users/register"]["post"]` | `registerUserUsersRegisterPost()`  |
| `response_model=UserResponse`   | `responses["201"]["schema"]`       | 返回类型 `UserResponse`            |

---

## 4. 文件清单：手动 vs 自动生成

### 🔧 需要手动创建/配置的文件

| 文件                   | 位置                | 说明                                   |
| ---------------------- | ------------------- | -------------------------------------- |
| `openapi.json`         | `frontend/`         | 从后端复制的 OpenAPI 规范文件          |
| `openapi-ts.config.ts` | `frontend/`         | 代码生成工具的配置文件                 |
| `src/api/config.ts`    | `frontend/src/api/` | **需要你创建** - 配置 baseUrl 和 Token |

### 🤖 自动生成的文件（不要手动编辑）

| 文件/目录               | 说明                       |
| ----------------------- | -------------------------- |
| `src/api/index.ts`      | 统一导出入口               |
| `src/api/types.gen.ts`  | 所有 TypeScript 类型定义   |
| `src/api/sdk.gen.ts`    | API 调用函数（SDK）        |
| `src/api/client.gen.ts` | HTTP 客户端实例            |
| `src/api/client/`       | 客户端核心代码             |
| `src/api/core/`         | 工具函数（认证、序列化等） |

> ⚠️ **重要**: 所有 `.gen.ts` 文件都是自动生成的，每次运行 `npm run api:generate` 都会被覆盖！

---

## 5. 配置步骤详解

### 步骤 1：复制 OpenAPI 规范文件

```bash
# 从后端 docs 目录复制到前端根目录
cp docs/api/openapi.json frontend/openapi.json
```

或者可以直接从后端 API 获取：

```bash
curl http://localhost:8000/openapi.json > frontend/openapi.json
```

### 步骤 2：安装依赖

```bash
cd frontend
npm install @hey-api/openapi-ts --save-dev
```

### 步骤 3：创建配置文件

**`frontend/openapi-ts.config.ts`**（已创建）：

```typescript
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  // OpenAPI 规范文件路径
  input: "./openapi.json",

  // 生成代码的输出目录
  output: {
    path: "./src/api",
    format: "prettier",
  },

  // 使用 fetch 客户端
  client: "@hey-api/client-fetch",

  // 插件配置
  plugins: [
    "@hey-api/typescript", // 生成类型
    "@hey-api/sdk", // 生成 SDK 函数
  ],
});
```

### 步骤 4：添加 npm script

在 `package.json` 中添加（已添加）：

```json
{
  "scripts": {
    "api:generate": "openapi-ts"
  }
}
```

### 步骤 5：运行生成命令

```bash
npm run api:generate
```

### 步骤 6：创建客户端配置文件 ⚠️ 手动创建

创建 **`frontend/src/api/config.ts`**：

```typescript
import { client } from "./client.gen";

// 配置 API 基础地址
client.setConfig({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// 配置请求拦截器：自动添加 Token
client.interceptors.request.use((request) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    request.headers.set("Authorization", `Bearer ${token}`);
  }
  return request;
});

// 配置响应拦截器：处理 401 错误
client.interceptors.response.use((response) => {
  if (response.status === 401) {
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  }
  return response;
});

export { client };
```

### 步骤 7：在应用入口导入配置

在 **`src/main.tsx`** 中添加：

```typescript
import "./api/config"; // 初始化 API 客户端配置
```

---

## 6. 生成文件结构说明

运行 `npm run api:generate` 后，会在 `src/api/` 目录下生成以下文件：

```
src/api/
├── index.ts              # 统一导出入口
├── types.gen.ts          # 🔹 TypeScript 类型定义
├── sdk.gen.ts            # 🔹 API 调用函数
├── client.gen.ts         # 🔹 HTTP 客户端实例
├── client/               # 客户端核心代码
│   ├── index.ts
│   ├── client.gen.ts
│   ├── types.gen.ts
│   └── utils.gen.ts
└── core/                 # 工具函数
    ├── auth.gen.ts       # 认证处理
    ├── bodySerializer.gen.ts
    ├── params.gen.ts
    └── ...
```

### 各文件详细说明

#### `types.gen.ts` - 类型定义

包含所有从 OpenAPI 生成的 TypeScript 类型：

```typescript
// 数据模型类型
export type UserRegister = {
  username: string;
  email: string;
  password: string;
  full_name?: string | null;
  // ...
};

export type UserResponse = {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  role?: UserRole;
  // ...
};

export type UserRole = "user" | "admin" | "superadmin";

// 请求/响应类型
export type RegisterUserUsersRegisterPostData = {
  body: UserRegister;
  url: "/users/register";
};
```

#### `sdk.gen.ts` - API 调用函数

包含所有 API 调用函数：

```typescript
/**
 * 注册新用户
 * 创建一个新用户账号（默认普通用户权限）
 */
export const registerUserUsersRegisterPost = (options) =>
  client.post({ url: "/users/register", ...options });

/**
 * 用户登录
 * 使用用户名/邮箱和密码登录
 */
export const loginUsersLoginPost = (options) =>
  client.post({ url: "/users/login", ...options });

/**
 * 获取当前用户信息
 */
export const getCurrentUserInfoUsersMeGet = (options?) =>
  client.get({ url: "/users/me", ...options });
```

#### `client.gen.ts` - 客户端实例

```typescript
// 创建并导出默认客户端实例
export const client = createClient(createConfig());
```

---

## 7. 如何使用生成的代码

### 7.1 基本使用

```typescript
import {
  registerUserUsersRegisterPost,
  loginUsersLoginPost,
  getCurrentUserInfoUsersMeGet,
  type UserRegister,
  type UserResponse,
} from "@/api";

// 注册用户
async function register() {
  const result = await registerUserUsersRegisterPost({
    body: {
      username: "alice",
      email: "alice@example.com",
      password: "secret123",
    },
  });

  if (result.data) {
    console.log("注册成功:", result.data);
  }
  if (result.error) {
    console.error("注册失败:", result.error);
  }
}

// 登录
async function login() {
  const result = await loginUsersLoginPost({
    body: {
      username: "alice",
      password: "secret123",
    },
  });

  if (result.data) {
    localStorage.setItem("access_token", result.data.access_token);
  }
}

// 获取当前用户
async function getMe() {
  const result = await getCurrentUserInfoUsersMeGet();

  if (result.data) {
    const user: UserResponse = result.data;
    console.log("当前用户:", user.username);
  }
}
```

### 7.2 错误处理

```typescript
import { getUsersListUsersGet } from "@/api";

async function getUsers() {
  const result = await getUsersListUsersGet({
    query: { skip: 0, limit: 10 },
  });

  if (result.error) {
    // 处理验证错误
    if (result.response.status === 422) {
      console.error("验证错误:", result.error.detail);
    }
    // 处理未授权
    if (result.response.status === 401) {
      console.error("未登录");
    }
    return;
  }

  console.log("用户列表:", result.data.users);
  console.log("总数:", result.data.total);
}
```

### 7.3 在 React 组件中使用

```tsx
import { useState, useEffect } from "react";
import { getCurrentUserInfoUsersMeGet, type UserResponse } from "@/api";

function Profile() {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const result = await getCurrentUserInfoUsersMeGet();

      if (result.data) {
        setUser(result.data);
      } else if (result.error) {
        setError("获取用户信息失败");
      }

      setLoading(false);
    }

    fetchUser();
  }, []);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  if (!user) return <div>未登录</div>;

  return (
    <div>
      <h1>欢迎, {user.username}!</h1>
      <p>邮箱: {user.email}</p>
      <p>角色: {user.role}</p>
    </div>
  );
}
```

---

## 8. 日常开发流程

### 当后端 API 发生变更时

```bash
# 1. 重新获取 OpenAPI 规范
curl http://localhost:8000/openapi.json > frontend/openapi.json

# 或直接复制
cp docs/api/openapi.json frontend/openapi.json

# 2. 重新生成代码
cd frontend
npm run api:generate

# 3. 查看变更（可选）
git diff src/api/
```

### 推荐的工作流

1. **后端完成 API 开发** → 测试接口正常
2. **导出 OpenAPI 规范** → `curl` 或复制 JSON 文件
3. **运行代码生成** → `npm run api:generate`
4. **前端使用新 API** → 有完整类型提示
5. **提交代码** → 包含生成的文件

---

## 9. 常见问题

### Q1: 生成的函数名太长怎么办？

函数名是根据 OpenAPI 的 `operationId` 生成的。你可以在后端自定义：

```python
@app.post("/users/register", operation_id="register")
def register_user(...):
    pass
```

这样生成的函数名就会是 `register` 而不是 `registerUserUsersRegisterPost`。

### Q2: 如何自定义生成的代码？

可以在 `openapi-ts.config.ts` 中配置更多选项：

```typescript
export default defineConfig({
  input: "./openapi.json",
  output: {
    path: "./src/api",
    format: "prettier",
  },
  client: "@hey-api/client-fetch",
  plugins: [
    {
      name: "@hey-api/typescript",
      enums: "javascript", // 使用 JS enum 而不是 TS enum
    },
    "@hey-api/sdk",
  ],
});
```

### Q3: 生成的代码报 TypeScript 错误？

确保 `tsconfig.json` 配置正确：

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

### Q4: 如何处理文件上传？

生成的代码会自动处理 `multipart/form-data`，你只需传入 `FormData`：

```typescript
const formData = new FormData();
formData.append("file", fileInput.files[0]);

await uploadFilePost({ body: formData });
```

---

## 快速参考

### 常用命令

| 命令                   | 说明              |
| ---------------------- | ----------------- |
| `npm run api:generate` | 重新生成 API 代码 |
| `npm run dev`          | 启动开发服务器    |

### 导入示例

```typescript
// 导入 API 函数
import { loginUsersLoginPost, getCurrentUserInfoUsersMeGet } from "@/api";

// 导入类型
import type { UserRegister, UserResponse, UserRole } from "@/api";

// 导入客户端（用于自定义配置）
import { client } from "@/api/client.gen";
```

---

_文档创建时间: 2025-12-04_
_工具版本: @hey-api/openapi-ts v0.88.0_
