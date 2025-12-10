import { Routes, Route } from "react-router-dom";
// import { ProtectedRoute } from "@/components/common";
import Layout from "@/Layout";

// 导入各模块路由
import { authRoutes } from "./Auth";
import { blogRoutes } from "./Blog";
import { dashboardRoutes } from "./Dashboard";
import { mdxRoutes } from "./MDX";

// 页面导入
import Home from "@/pages/HomePage";
import About from "@/pages/About";
import TestHighlight from "@/pages/TestHighlight";
import NotFound from "@/pages/NotFound";

/**
 * 🏠 主应用路由配置
 *
 * 采用模块化路由结构：
 * - 认证模块
 * - 博客模块
 * - 仪表盘模块
 * - MDX 模块
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* 首页和关于页 */}
        <Route index element={<Home />} />
        <Route path="home" element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="test-highlight" element={<TestHighlight />} />

        {/* 认证模块路由 */}
        <Route path="auth">{authRoutes}</Route>

        {/* 博客模块路由 */}
        <Route path="blog">{blogRoutes}</Route>

        {/* 仪表盘模块路由 - 需要登录 */}
        <Route path="dashboard">{dashboardRoutes}</Route>

        {/* MDX 模块路由 - 需要登录 */}
        <Route path="mdx">{mdxRoutes}</Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
