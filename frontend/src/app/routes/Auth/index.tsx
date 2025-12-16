import { Route } from "react-router-dom";
import Login from "@/features/auth/pages/auth/Login";
import Register from "@/features/auth/pages/auth/Register";

/**
 * 认证模块路由
 * 路径：/auth/login, /auth/register
 */
export const authRoutes = (
  <>
    <Route path="login" element={<Login />} />
    <Route path="register" element={<Register />} />
  </>
);
