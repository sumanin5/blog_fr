# 第 4 层：路由器缓存 (Router Cache)

## 基本信息

| 属性         | 值                                     |
| ------------ | -------------------------------------- |
| **位置**     | 客户端（浏览器内存）                   |
| **持续时间** | 用户会话期间（30 秒 - 5 分钟）         |
| **缓存内容** | RSC Payload                            |
| **失效时机** | 页面刷新、时间过期、`router.refresh()` |

---

## 这是什么？

**路由器缓存（Router Cache）** 是导致 **"我明明更新了数据库，页面也没报错，但数据就是没变"** 的罪魁祸首。

当用户在你的网站内跳转（点击 `<Link>`）时，Next.js 会把访问过的页面 Payload 存在浏览器的内存里。

```mermaid
graph TB
    User[用户在网站内跳转] --> Link[点击 Link]
    Link --> Cache[路由器缓存<br/>浏览器内存]
    Cache --> Fast[⚡ 瞬间跳转]

    style Cache fill:#f5e1ff,stroke:#333,stroke-width:2px
    style Fast fill:#9f9,stroke:#333,stroke-width:2px
```

---

## 工作原理

### 第一次访问

```mermaid
sequenceDiagram
    participant User as 用户
    participant Browser as 浏览器
    participant Server as 服务器
    participant Memory as 内存缓存

    User->>Browser: 点击 Link 到 /blog
    Browser->>Memory: 查找缓存
    Memory-->>Browser: ❌ 没有缓存
    Browser->>Server: 请求 /blog
    Server-->>Browser: 返回 RSC Payload
    Browser->>Memory: 💾 存储到内存
    Browser-->>User: 显示页面
```

### 后续访问（30 秒内）

```mermaid
sequenceDiagram
    participant User as 用户
    participant Browser as 浏览器
    participant Server as 服务器
    participant Memory as 内存缓存

    User->>Browser: 再次访问 /blog
    Browser->>Memory: 查找缓存
    Memory-->>Browser: ✅ 找到缓存
    Browser-->>User: 瞬间显示（不请求服务器）

    Note over Server: 服务器完全不知道<br/>用户访问了页面
```

---

## 缓存时长

| 页面类型     | 缓存时长 |
| ------------ | -------- |
| **静态页面** | 5 分钟   |
| **动态页面** | 30 秒    |

```mermaid
graph LR
    Static[静态页面] --> Cache1[缓存 5 分钟]
    Dynamic[动态页面] --> Cache2[缓存 30 秒]

    style Cache1 fill:#9f9,stroke:#333,stroke-width:2px
    style Cache2 fill:#ff9,stroke:#333,stroke-width:2px
```

---

## 经典问题场景

### 场景 1：点击后退，数据是旧的

**操作流程**：

```mermaid
sequenceDiagram
    participant User as 用户
    participant List as 列表页
    participant Detail as 详情页
    participant Memory as 内存缓存

    User->>List: 1. 访问列表页
    List-->>Memory: 缓存列表数据

    User->>Detail: 2. 点击进入详情页
    User->>Detail: 3. 修改标题
    Detail-->>User: ✅ 修改成功

    User->>Memory: 4. 点击后退
    Memory-->>User: ❌ 显示旧数据（从内存读取）

    Note over User: 为什么还是旧标题？
```

**代码示例**：

```typescript
// app/posts/page.tsx - 列表页
export default async function PostsPage() {
  const res = await fetch("https://api.example.com/posts");
  const posts = await res.json();

  return (
    <div>
      {posts.map((post) => (
        <Link key={post.id} href={`/posts/${post.id}`}>
          <h2>{post.title}</h2> {/* 旧标题 */}
        </Link>
      ))}
    </div>
  );
}

// app/posts/[id]/page.tsx - 详情页
export default async function PostPage({ params }) {
  const res = await fetch(`https://api.example.com/posts/${params.id}`);
  const post = await res.json();

  return <div>{post.title}</div>;
}

// app/posts/[id]/edit/page.tsx - 编辑页
("use client");

export default function EditPage() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    // 1. 更新文章
    await fetch(`/api/posts/${id}`, {
      method: "PUT",
      body: formData,
    });

    // 2. 返回列表页
    router.back(); // ❌ 问题：列表页显示旧数据
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**问题**：

- 列表页的数据被缓存在浏览器内存中
- 点击后退时，直接从内存读取，不请求服务器
- 所以看到的还是旧标题

---

### 场景 2：在新标签页打开正常，在当前页跳转就不对

**操作流程**：

```mermaid
graph TB
    A[访问列表页] --> B[缓存到内存]
    B --> C{如何打开详情页?}

    C -->|新标签页打开| D[✅ 数据正常<br/>不使用缓存]
    C -->|当前页跳转| E[❌ 数据是旧的<br/>使用缓存]

    style D fill:#9f9,stroke:#333,stroke-width:2px
    style E fill:#f99,stroke:#333,stroke-width:2px
```

**原因**：

- 新标签页：全新的浏览器上下文，没有缓存
- 当前页跳转：使用 `<Link>`，会使用路由器缓存

---

## 解决方案

### 方案 1：使用 router.refresh()

```typescript
"use client";

import { useRouter } from "next/navigation";

export default function EditPage() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    // 1. 更新文章
    await fetch(`/api/posts/${id}`, {
      method: "PUT",
      body: formData,
    });

    // 2. ✅ 刷新路由器缓存
    router.refresh();

    // 3. 返回列表页
    router.back();
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**效果**：

```mermaid
sequenceDiagram
    participant User as 用户
    participant Client as 客户端
    participant Memory as 内存缓存
    participant Server as 服务器

    User->>Client: 提交表单
    Client->>Server: 更新数据
    Server-->>Client: ✅ 成功
    Client->>Memory: router.refresh()
    Memory->>Memory: 清空缓存
    Client->>Server: 重新请求当前页面
    Server-->>Client: 返回新数据
    Client-->>User: 显示新数据
```

---

### 方案 2：使用 revalidatePath (Server Action)

```typescript
// app/actions.ts
"use server";

import { revalidatePath } from "next/cache";

export async function updatePost(id: string, formData: FormData) {
  // 1. 更新文章
  await db.post.update({
    where: { id },
    data: {
      title: formData.get("title"),
      content: formData.get("content"),
    },
  });

  // 2. ✅ 失效缓存
  revalidatePath("/posts"); // 失效列表页
  revalidatePath(`/posts/${id}`); // 失效详情页
}

// app/posts/[id]/edit/page.tsx
("use client");

import { updatePost } from "@/app/actions";
import { useRouter } from "next/navigation";

export default function EditPage({ params }) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    // 调用 Server Action
    await updatePost(params.id, formData);

    // 返回列表页（缓存已失效）
    router.push("/posts");
  }

  return <form action={handleSubmit}>...</form>;
}
```

**优势**：

- ✅ 同时失效服务端缓存和客户端缓存
- ✅ 更彻底的解决方案

---

### 方案 3：使用 revalidateTag

```typescript
// 1. 请求时打标签
const res = await fetch('https://api.example.com/posts', {
  next: { tags: ['posts'] }
});

// 2. 更新时失效标签
'use server';

import { revalidateTag } from 'next/cache';

export async function updatePost(id: string, formData: FormData) {
  await db.post.update({ where: { id }, data: { ... } });

  // ✅ 失效所有带 'posts' 标签的缓存
  revalidateTag('posts');
}
```

---

## 如何禁用路由器缓存？

### 方法 1：使用 prefetch={false}

```typescript
// ❌ 默认：会预取和缓存
<Link href="/posts">文章列表</Link>

// ✅ 禁用预取和缓存
<Link href="/posts" prefetch={false}>
  文章列表
</Link>
```

---

### 方法 2：使用 window.location

```typescript
"use client";

export default function Component() {
  function handleClick() {
    // ✅ 完全绕过路由器缓存
    window.location.href = "/posts";
  }

  return <button onClick={handleClick}>跳转</button>;
}
```

**缺点**：

- ❌ 会刷新整个页面（失去 SPA 体验）
- ❌ 失去 Next.js 的优化

---

### 方法 3：配置 staleTimes（实验性）

```typescript
// next.config.js
module.exports = {
  experimental: {
    staleTimes: {
      dynamic: 0, // 动态页面不缓存
      static: 0, // 静态页面也不缓存
    },
  },
};
```

---

## 路由器缓存 vs 浏览器缓存

| 特性         | 路由器缓存         | 浏览器缓存     |
| ------------ | ------------------ | -------------- |
| **位置**     | 浏览器内存         | 浏览器磁盘     |
| **触发方式** | `<Link>` 跳转      | 直接访问 URL   |
| **缓存内容** | RSC Payload        | HTML + 资源    |
| **生命周期** | 30 秒 - 5 分钟     | 根据 HTTP 头   |
| **清除方式** | `router.refresh()` | 清除浏览器缓存 |

```mermaid
graph TB
    subgraph 路由器缓存
        Link[Link 跳转] --> Memory[内存]
        Memory --> Fast1[⚡ 瞬间跳转]
    end

    subgraph 浏览器缓存
        URL[直接访问 URL] --> Disk[磁盘]
        Disk --> Fast2[⚡ 快速加载]
    end

    style Memory fill:#f5e1ff,stroke:#333,stroke-width:2px
    style Disk fill:#e1f5ff,stroke:#333,stroke-width:2px
```

---

## 实战案例

### 案例：博客系统完整解决方案

```typescript
// app/posts/page.tsx - 列表页
export default async function PostsPage() {
  const res = await fetch("https://api.example.com/posts", {
    next: {
      revalidate: 60,
      tags: ["posts"],
    },
  });

  const posts = await res.json();

  return (
    <div>
      {posts.map((post) => (
        <Link key={post.id} href={`/posts/${post.id}`}>
          <h2>{post.title}</h2>
        </Link>
      ))}
    </div>
  );
}

// app/posts/[id]/page.tsx - 详情页
export default async function PostPage({ params }) {
  const res = await fetch(`https://api.example.com/posts/${params.id}`, {
    next: {
      revalidate: 60,
      tags: ["posts", `post-${params.id}`],
    },
  });

  const post = await res.json();

  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      <Link href={`/posts/${params.id}/edit`}>编辑</Link>
    </div>
  );
}

// app/actions.ts - Server Actions
("use server");

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function updatePost(id: string, formData: FormData) {
  // 1. 更新数据库
  await db.post.update({
    where: { id },
    data: {
      title: formData.get("title"),
      content: formData.get("content"),
    },
  });

  // 2. 失效缓存
  revalidateTag("posts"); // 失效列表页
  revalidateTag(`post-${id}`); // 失效详情页

  // 3. 重定向
  redirect(`/posts/${id}`);
}

// app/posts/[id]/edit/page.tsx - 编辑页
import { updatePost } from "@/app/actions";

export default function EditPage({ params }) {
  return (
    <form action={updatePost.bind(null, params.id)}>
      <input name="title" />
      <textarea name="content" />
      <button type="submit">保存</button>
    </form>
  );
}
```

**流程**：

```mermaid
sequenceDiagram
    participant User as 用户
    participant List as 列表页
    participant Detail as 详情页
    participant Edit as 编辑页
    participant Action as Server Action
    participant Cache as 缓存

    User->>List: 1. 访问列表页
    User->>Detail: 2. 点击文章
    User->>Edit: 3. 点击编辑
    User->>Action: 4. 提交表单
    Action->>Action: 更新数据库
    Action->>Cache: revalidateTag('posts')
    Cache->>Cache: 清空所有相关缓存
    Action->>Detail: redirect 到详情页
    Detail->>User: ✅ 显示新数据

    User->>List: 5. 返回列表页
    List->>User: ✅ 显示新数据（缓存已失效）
```

---

## 常见问题

### Q1: 为什么刷新页面就正常了？

**原因**：刷新页面会清空路由器缓存。

```mermaid
graph LR
    A[Link 跳转] --> B[使用缓存<br/>❌ 旧数据]
    C[刷新页面] --> D[清空缓存<br/>✅ 新数据]

    style B fill:#f99,stroke:#333,stroke-width:2px
    style D fill:#9f9,stroke:#333,stroke-width:2px
```

---

### Q2: 如何在开发时禁用路由器缓存？

```typescript
// next.config.js
module.exports = {
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};
```

**注意**：这会影响性能，只在开发时使用。

---

### Q3: router.refresh() 和 revalidatePath 有什么区别？

| 特性         | router.refresh()      | revalidatePath() |
| ------------ | --------------------- | ---------------- |
| **位置**     | 客户端                | 服务端           |
| **作用范围** | 当前页面              | 指定路径         |
| **失效层级** | 第 4 层（路由器缓存） | 第 2、3、4 层    |
| **推荐度**   | ⚠️ 临时方案           | ✅ 推荐          |

---

## 总结

**路由器缓存（Router Cache）** 是 Next.js 缓存的第四层：

```mermaid
graph TB
    Link[Link 跳转] --> Cache[路由器缓存<br/>浏览器内存]
    Cache --> Check{缓存是否过期?}
    Check -->|未过期| Old[返回缓存<br/>❌ 可能是旧数据]
    Check -->|已过期| New[请求服务器<br/>✅ 新数据]

    style Old fill:#f99,stroke:#333,stroke-width:2px
    style New fill:#9f9,stroke:#333,stroke-width:2px
```

**核心要点**：

- ✅ 在浏览器内存中缓存页面
- ✅ 缓存时长：30 秒 - 5 分钟
- ✅ 使用 `revalidatePath` 或 `router.refresh()` 失效
- ⚠️ 最容易被忽视的缓存层

**下一步**：查看总结文档，了解如何综合运用四层缓存。
