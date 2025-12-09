# Provider 配置指南

## 🎯 什么是 Provider？

Provider 是 React Context 的提供者，它让子组件可以访问全局状态。

**类比：** Provider 就像一个"水源"，所有在它内部的组件都可以"取水"（访问状态）。

---

## 📦 项目中的 Providers

### 1. ThemeProvider - 主题提供者

**位置：** `src/contexts/ThemeContext.tsx`

**功能：**

- 管理主题状态（dark / light / system）
- 监听系统主题变化
- 持久化到 localStorage

**使用：**

```tsx
import { useTheme } from "@/contexts/ThemeContext";

function MyComponent() {
  const { theme, setTheme } = useTheme();

  return <button onClick={() => setTheme("dark")}>切换到深色模式</button>;
}
```

### 2. AuthProvider - 认证提供者

**位置：** `src/contexts/AuthContext.tsx`

**功能：**

- 管理用户登录状态
- 提供登录/登出方法
- 存储用户信息

**使用：**

```tsx
import { useAuth } from "@/contexts";

function MyComponent() {
  const { user, logout } = useAuth();

  return (
    <div>
      <p>欢迎, {user?.username}</p>
      <button onClick={logout}>退出</button>
    </div>
  );
}
```

---

## 🏗️ Provider 嵌套顺序

在 `App.tsx` 中，Provider 的嵌套顺序很重要：

```tsx
<ThemeProvider>
  {" "}
  {/* 最外层 - 主题 */}
  <AuthProvider>
    {" "}
    {/* 中间层 - 认证 */}
    <BrowserRouter>
      {" "}
      {/* 路由 */}
      <Routes>{/* 路由配置 */}</Routes>
    </BrowserRouter>
  </AuthProvider>
</ThemeProvider>
```

### 为什么这样排序？

1. **ThemeProvider 在最外层**
   - 主题是全局的，所有组件都需要
   - 包括登录页、注册页等认证页面也需要主题

2. **AuthProvider 在中间**
   - 认证状态只在应用内部需要
   - 不需要在主题切换时重新初始化

3. **BrowserRouter 在内层**
   - 路由是应用逻辑的一部分
   - 依赖于认证状态来决定跳转

---

## ✅ 正确配置示例

### App.tsx

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import AppRoutes from "@/routes/AppRoutes";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="my-blog-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<AppRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

---

## ❌ 常见错误

### 错误 1：忘记包裹 ThemeProvider

```tsx
// ❌ 错误 - 没有 ThemeProvider
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>{/* ... */}</BrowserRouter>
    </AuthProvider>
  );
}
```

**症状：** 主题切换按钮点击无效，控制台报错：

```
Error: useTheme must be used within a ThemeProvider
```

**解决：** 在最外层添加 `<ThemeProvider>`

### 错误 2：Provider 顺序错误

```tsx
// ❌ 错误 - AuthProvider 在外层
<AuthProvider>
  <ThemeProvider>{/* ... */}</ThemeProvider>
</AuthProvider>
```

**问题：** 登录页无法使用主题切换

**解决：** ThemeProvider 应该在最外层

### 错误 3：在 Provider 外部使用 Hook

```tsx
// ❌ 错误 - 在 ThemeProvider 外部使用 useTheme
function App() {
  const { theme } = useTheme(); // 报错！

  return <ThemeProvider>{/* ... */}</ThemeProvider>;
}
```

**解决：** 只在 Provider 内部的组件中使用 Hook

---

## 🔍 调试技巧

### 检查 Provider 是否生效

在浏览器控制台运行：

```javascript
// 检查主题
localStorage.getItem("my-blog-theme");

// 检查 HTML 类名
document.documentElement.classList;
// 应该包含 'dark' 或 'light'
```

### React DevTools

1. 安装 React DevTools 浏览器扩展
2. 打开开发者工具 → Components 标签
3. 查看组件树，确认 Provider 的嵌套顺序
4. 选中组件，查看 hooks 状态

---

## 📚 相关文档

- [ThemeContext 源码](../../src/contexts/ThemeContext.tsx)
- [AuthContext 源码](../../src/contexts/AuthContext.tsx)
- [React Context 官方文档](https://react.dev/learn/passing-data-deeply-with-context)

---

## 🎯 最佳实践

### 1. 统一的 Provider 配置

创建一个 `Providers.tsx` 文件统一管理：

```tsx
// src/components/Providers.tsx
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="my-blog-theme">
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
```

然后在 `App.tsx` 中使用：

```tsx
import { Providers } from "@/components/Providers";

function App() {
  return (
    <Providers>
      <BrowserRouter>{/* ... */}</BrowserRouter>
    </Providers>
  );
}
```

### 2. 类型安全的 Hook

确保 Hook 在 Provider 外部使用时有清晰的错误提示：

```tsx
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
```

### 3. 默认值设置

为 Provider 提供合理的默认值：

```tsx
<ThemeProvider
  defaultTheme="system" // 默认跟随系统
  storageKey="my-blog-theme" // localStorage 键名
  enableTransitions={true} // 启用过渡动画
>
  {children}
</ThemeProvider>
```

---

## 🚀 下一步

- [ ] 确认 `App.tsx` 中 Provider 配置正确
- [ ] 测试主题切换功能
- [ ] 查看 [主题系统文档](../components/theme-system.md)
- [ ] 了解 [Context + Hooks 原理](../concepts/context-hooks.md)
