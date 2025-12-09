# 导航和路由配置指南

## 🗺️ 路由结构

### 当前路由配置

```
/                    → 首页 (HomePage)
├── /home            → 首页 (同上)
├── /blog            → 博客列表 (BlogList)
│   └── /blog/:id    → 博客详情 (待开发)
├── /dashboard       → 仪表盘 (Dashboard)
└── /about           → 关于页面 (About)

/auth/*              → 认证模块
├── /auth/login      → 登录页
└── /auth/register   → 注册页
```

---

## 📝 路由配置文件

### App.tsx - 顶层路由

```tsx
<Routes>
  {/* 认证路由 */}
  <Route path="/auth/*" element={<AuthRoutes />} />

  {/* 兼容性重定向 */}
  <Route path="/login" element={<Navigate to="/auth/login" />} />
  <Route path="/register" element={<Navigate to="/auth/register" />} />

  {/* 主应用路由 */}
  <Route path="/*" element={<AppRoutes />} />
</Routes>
```

### AppRoutes.tsx - 主应用路由

```tsx
<Routes>
  <Route
    element={
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    }
  >
    {/* 首页 */}
    <Route index element={<Home />} />

    {/* 业务页面 */}
    <Route path="home" element={<Home />} />
    <Route path="blog" element={<BlogList />} />
    <Route path="blog/:id" element={<BlogDetail />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="about" element={<About />} />
  </Route>

  {/* 404 */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

## 🎯 导航链接配置

### Header.tsx - 导航链接

```tsx
const NAV_LINKS = [
  { path: "/", label: "主页", code: "/HOME" },
  { path: "/blog", label: "博客", code: "/BLOG" },
  { path: "/dashboard", label: "仪表盘", code: "/DASHBOARD" },
  { path: "/about", label: "关于", code: "/ABOUT" },
];
```

**重要：** 路径必须以 `/` 开头（绝对路径），这样才能正确匹配路由。

---

## 🔍 路由匹配规则

### 绝对路径 vs 相对路径

```tsx
// ✅ 正确 - 绝对路径
<Link to="/">首页</Link>
<Link to="/blog">博客</Link>

// ❌ 错误 - 相对路径（会基于当前路径拼接）
<Link to="blog">博客</Link>  // 在 /dashboard 下会变成 /dashboard/blog
```

### 路由定义

```tsx
// 在嵌套路由中
<Route path="blog" element={<BlogList />} />
// 匹配: /blog

<Route path="/blog" element={<BlogList />} />
// 匹配: /blog（效果相同，但推荐不加 /）

<Route index element={<Home />} />
// 匹配: 父路由的根路径（如 /）
```

---

## 🐛 常见问题

### 问题 1：点击导航后跳转到错误的页面

**症状：** 点击"主页"跳转到了 dashboard

**原因：** 路由配置中有重定向：

```tsx
<Route index element={<Navigate to="/dashboard" />} />
```

**解决：** 改为直接渲染组件：

```tsx
<Route index element={<Home />} />
```

### 问题 2：导航链接不匹配路由

**症状：** 点击链接后 404

**原因：** Header 中的路径和路由定义不一致

**检查：**

```tsx
// Header.tsx
{ path: "/home", ... }  // ❌

// AppRoutes.tsx
<Route path="home" ... />  // 实际匹配 /home

// 解决：统一使用绝对路径
{ path: "/", ... }  // ✅
```

### 问题 3：刷新页面后 404

**原因：** 开发服务器没有配置 SPA 回退

**解决：** Vite 默认已配置，如果使用 Nginx 部署，需要配置：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## 🎨 激活状态判断

### 简单匹配

```tsx
const isActive = (path: string) => {
  return location.pathname === path;
};
```

### 前缀匹配

```tsx
const isActive = (path: string) => {
  if (path === "/") return location.pathname === "/";
  return location.pathname.startsWith(path);
};
```

**示例：**

- 当前路径：`/blog/123`
- `/blog` → `true`（前缀匹配）
- `/` → `false`（精确匹配）

---

## 🚀 编程式导航

### 使用 useNavigate

```tsx
import { useNavigate } from "react-router-dom";

function MyComponent() {
  const navigate = useNavigate();

  const handleClick = () => {
    // 跳转到指定路径
    navigate("/blog");

    // 带参数跳转
    navigate("/blog/123");

    // 替换当前历史记录（不可后退）
    navigate("/blog", { replace: true });

    // 后退
    navigate(-1);

    // 前进
    navigate(1);
  };

  return <button onClick={handleClick}>跳转</button>;
}
```

---

## 📦 路由参数

### URL 参数

```tsx
// 路由定义
<Route path="blog/:id" element={<BlogDetail />} />;

// 获取参数
import { useParams } from "react-router-dom";

function BlogDetail() {
  const { id } = useParams();
  return <div>文章 ID: {id}</div>;
}
```

### 查询参数

```tsx
// URL: /blog?category=react&sort=date

import { useSearchParams } from "react-router-dom";

function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get("category"); // "react"
  const sort = searchParams.get("sort"); // "date"

  // 更新查询参数
  const updateCategory = (cat: string) => {
    setSearchParams({ category: cat, sort });
  };

  return <div>分类: {category}</div>;
}
```

---

## 🔐 受保护的路由

### ProtectedRoute 组件

```tsx
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}
```

### 使用方式

```tsx
<Route
  element={
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  }
>
  <Route path="dashboard" element={<Dashboard />} />
  {/* 所有子路由都需要登录 */}
</Route>
```

---

## 📊 路由状态管理

### 传递状态

```tsx
// 跳转时传递状态
navigate("/blog", { state: { from: "home" } });

// 接收状态
import { useLocation } from "react-router-dom";

function Blog() {
  const location = useLocation();
  const from = location.state?.from; // "home"
}
```

---

## 🎯 最佳实践

### 1. 集中管理路由配置

```tsx
// routes/config.ts
export const ROUTES = {
  HOME: "/",
  BLOG: "/blog",
  BLOG_DETAIL: (id: string) => `/blog/${id}`,
  DASHBOARD: "/dashboard",
  ABOUT: "/about",
};

// 使用
<Link to={ROUTES.HOME}>首页</Link>;
navigate(ROUTES.BLOG_DETAIL("123"));
```

### 2. 路由懒加载

```tsx
import { lazy, Suspense } from "react";

const BlogList = lazy(() => import("@/pages/BlogList"));

<Route
  path="blog"
  element={
    <Suspense fallback={<div>加载中...</div>}>
      <BlogList />
    </Suspense>
  }
/>;
```

### 3. 面包屑导航

```tsx
function Breadcrumb() {
  const location = useLocation();
  const paths = location.pathname.split("/").filter(Boolean);

  return (
    <nav>
      <Link to="/">首页</Link>
      {paths.map((path, index) => (
        <span key={path}>
          {" / "}
          <Link to={`/${paths.slice(0, index + 1).join("/")}`}>{path}</Link>
        </span>
      ))}
    </nav>
  );
}
```

---

## 🔧 调试技巧

### 查看当前路由信息

```tsx
import { useLocation } from "react-router-dom";

function DebugRoute() {
  const location = useLocation();

  console.log("当前路径:", location.pathname);
  console.log("查询参数:", location.search);
  console.log("Hash:", location.hash);
  console.log("状态:", location.state);

  return null;
}
```

### React Router DevTools

安装浏览器扩展查看路由状态和历史记录。

---

## ✅ 检查清单

- [ ] 所有导航链接使用绝对路径（以 `/` 开头）
- [ ] 路由定义和导航链接路径一致
- [ ] 首页路由正确配置（不要重定向到 dashboard）
- [ ] 404 页面已配置
- [ ] 受保护的路由已添加 ProtectedRoute
- [ ] 动态路由参数正确获取
- [ ] 激活状态判断逻辑正确

---

**现在导航应该可以正常工作了！** 🎉
