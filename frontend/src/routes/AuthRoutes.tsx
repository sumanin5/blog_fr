import { Route, Routes, Navigate } from "react-router-dom";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

/**
 * 🔒 认证模块路由配
 *
 * 这里负责处理所有与身份验证相关的页面。
 * 父级路由 (App.tsx) 已经指定了前缀 (例如 /auth/*)，
 * 所以这里的 path 只需要写相对路径即可。
 *
 * 最终访问路径示例:
 * /auth/login
 * /auth/register
 */
export default function AuthRoutes() {
  return (
    <Routes>
      {/* 默认重定向: 访问 /auth 时自动跳到 /auth/login */}
      <Route index element={<Navigate to="login" replace />} />

      {/* 相对路径，不需要加 / */}
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
    </Routes>
  );
}
