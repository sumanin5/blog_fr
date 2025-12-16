import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";
import { AuthProvider } from "@/shared/contexts";
import AppRoutes from "@/app/routes";

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
              主应用路由 (包含认证和业务页面)
              -------------------------------------------------------------------
              所有路由都通过 AppRoutes 统一处理，包括：
              - /auth/login - 登录页面
              - /auth/register - 注册页面
              - / - 首页
              - /blog - 博客列表
              - 其他所有业务页面

              AppRoutes 内部会处理：
              - ProtectedRoute（受保护的页面）
              - Layout 包装（统一的 Header/Footer/背景）
              - 根据路由条件显示/隐藏 Header 和 Footer
            */}
            <Route path="/*" element={<AppRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
