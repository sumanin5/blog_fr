这是一个非常关键且实战性极强的架构话题。在 **Next.js (BFF) + FastAPI** 的组合中，**认证（Auth）** 是最容易出错，也是最考验架构师功底的环节。

如果不做特殊设计，你可能会遇到“前端拿不到 Token”、“服务端组件没法调后端 API”、“Token 容易被 XSS 偷走”等一系列问题。

我将为你拆解这套 **“HTTP-only Cookie 透传架构”** 的核心逻辑、流程以及代码实现。

---

### 1. 核心矛盾：Token 放在哪？

在前后端分离架构中，JWT Token 应该存哪里？通常有两派：

- **LocalStorage 派：**
- **做法：** 浏览器拿到 Token 存 `localStorage`，每次请求手动加 `Authorization: Bearer ...`。
- **缺点：** 容易被 XSS 攻击（JS 脚本可以直接读取 Token）。更致命的是，**Next.js 的服务端组件（Server Components）运行在服务器上，根本读不到你浏览器里的 localStorage！**

- **Cookie 派（架构师推荐）：**
- **做法：** Token 存在 Cookie 中。
- **优势：** 安全（HTTP-only 防止 XSS）、服务端组件能自动读取、浏览器发请求会自动携带。

因此，在 Next.js 架构下，**Cookie 是唯一正确的选择**。

---

### 2. 架构流程图：BFF 中间层扮演的角色

想象 Next.js 的 BFF 层（Server Actions / Route Handlers）是一个**“二传手”**。

1. **登录 (Login)：**

- 浏览器 -> 提交表单给 Next.js Server Action。
- Next.js -> 转发请求给 FastAPI (`POST /login`)。
- FastAPI -> 返回 Access Token 给 Next.js。
- **关键动作：** Next.js 拿到 Token 后，不直接返给前端字符串，而是**把它“种”在浏览器的 Cookie 里**。

2. **访问受保护资源 (Access Protected Resource)：**

- 浏览器 -> 访问页面或调用 Server Action（自动携带 Cookie）。
- Next.js -> **从请求头中读取 Cookie**。
- Next.js -> 将 Token 取出，放入 Header (`Authorization: Bearer ...`)。
- Next.js -> 请求 FastAPI 数据接口。

---

### 3. 代码实战：Next.js 中间层的“偷天换日”

我们需要用到 `next/headers` 中的 `cookies` 工具。

#### 第一步：登录动作 (Server Action)

这是最关键的一步：**Token 的“封装”**。

```typescript
// src/app/actions/auth.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  // 1. Next.js 向 FastAPI 发起登录请求
  const res = await fetch("http://api-fastapi.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `username=${email}&password=${password}`, // FastAPI OAuth2 默认格式
  });

  const data = await res.json();

  if (!res.ok) {
    return { error: "登录失败" };
  }

  // 2. 拿到 FastAPI 给的 token
  const accessToken = data.access_token;

  // 3. 【核心步骤】将 Token 写入 HTTP-only Cookie
  // 这样 Token 就“粘”在了用户的浏览器上，但 JS 读不到，非常安全
  (await cookies()).set("session_token", accessToken, {
    httpOnly: true, // 禁止 JS 读取 (防 XSS)
    secure: process.env.NODE_ENV === "production", // 仅 HTTPS
    maxAge: 60 * 60 * 24 * 7, // 7天过期
    path: "/", // 全站有效
  });

  // 4. 跳转到后台首页
  redirect("/dashboard");
}
```

#### 第二步：数据透传 (Data Fetching in Server Component)

这是日常开发最频繁的场景：**Token 的“解封”与“转发”**。

```typescript
// src/app/dashboard/page.tsx
import { cookies } from "next/headers";

// 这是一个 Server Component
export default async function DashboardPage() {
  // 1. 从浏览器发来的请求中，提取 Cookie
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) {
    // 没登录，打回登录页
    return <div>请先登录</div>;
  }

  // 2. 【核心步骤】带着 Token 去请求 FastAPI
  const res = await fetch("http://api-fastapi.com/users/me", {
    headers: {
      // 这一步叫“透传”：把 Cookie 里的 Token 拿出来，塞进 Authorization 头
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    // Token 过期处理逻辑...
    return <div>Session 已过期</div>;
  }

  const user = await res.json();

  return (
    <div>
      <h1>欢迎回来, {user.username}</h1>
    </div>
  );
}
```

---

### 4. 为什么这套架构是“工业级”的？

1. **安全性 (Security)：**

- 浏览器端的 JS 代码（包括你的 React 组件）永远接触不到 Token。就算黑客在你网站注入了恶意脚本，他也拿不到 Token，也就无法伪造用户身份。

2. **RSC 兼容性 (Compatibility)：**

- 因为 Server Components 在服务端运行，它无法访问 `localStorage`。但这套架构利用 `cookies()` API，完美解决了服务端组件的鉴权问题。

3. **解耦 (Decoupling)：**

- FastAPI 不需要关心你是 Next.js 还是 Vue，它只认标准的 HTTP Header (`Authorization`)。
- Next.js 负责脏活累活（Cookie 管理），FastAPI 保持纯净。

### 5. 一个常见的“坑”：Token 刷新 (Refresh Token)

如果 Access Token 只有 30 分钟有效期，过期了怎么办？

在 Next.js 的这个架构中，通常会使用 **Next.js Middleware (中间件)** 来拦截所有请求。

- **Middleware 逻辑：**

1. 检查 Access Token 是否快过期。
2. 如果快过期，Middleware 在后台悄悄调用 FastAPI 的刷新接口。
3. 拿到新 Token，**在 Response Header 里更新 Cookie**。
4. 用户完全无感知，实现了“永久登录”。

这套 **Cookie 透传架构** 是目前 Next.js 全栈开发处理第三方 API 认证的标准答案。如果你能掌握这一套，你的架构安全性与稳定性就上了一个大台阶。
