import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
// 注意: 默认导出不需要加花括号 {}
import AuthRoutes from "@/routes/AuthRoutes";
import AppRoutes from "@/routes/AppRoutes";

function App() {
  return (
    // 全局状态提供者
    // ThemeProvider 必须在最外层，这样整个应用都能访问主题状态
    <ThemeProvider defaultTheme="system" storageKey="my-blog-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/*
              -------------------------------------------------------------------
              1. 认证模块 (Auth Module)
              -------------------------------------------------------------------
              将所有以 /auth 开头的路径委托给 AuthRoutes 组件处理。
              例如: /auth/login, /auth/register
            */}
            <Route path="/auth/*" element={<AuthRoutes />} />

            {/*
              兼容性重定向 (可选)
              如果你的代码里还有 to="/login" 的旧链接，这里可以做一个转发，
              保证用户访问 /login 时自动跳到新的 /auth/login
            */}
            <Route
              path="/login"
              element={<Navigate to="/auth/login" replace />}
            />
            <Route
              path="/register"
              element={<Navigate to="/auth/register" replace />}
            />

            {/*
              -------------------------------------------------------------------
              2. 主应用模块 (App Module)
              -------------------------------------------------------------------
              path="/*" 是一个通配符匹配。
              如果上面的 /auth/* 没有匹配到，React Router 就会尝试匹配这个。
              这里我们将剩余的所有路径都交给 AppRoutes 处理。
              (AppRoutes 内部会处理 ProtectedRoute 和 404)
            */}
            <Route path="/*" element={<AppRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
