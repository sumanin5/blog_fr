import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/common";

import Layout from "@/Layout";

// 页面组件
import Home from "@/pages/HomePage";
import About from "@/pages/About";
import Dashboard from "@/pages/Dashboard";
import BlogList from "@/pages/BlogList";
import MDXShowcase from "@/pages/MDXShowcase";
import MDXEditor from "@/pages/MDXEditor";
import TestHighlight from "@/pages/TestHighlight";

/**
 * 🏠 主应用路由配置
 *
 * 这里负责处理登录后才能访问的业务页面。
 * 整个模块都被 <ProtectedRoute> 保护着，
 * 如果用户没登录，根本进不来这里。
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/*
        核心布局层
        所有业务页面都包裹在 Layout 中 (包含侧边栏、顶部导航等)
        并且经过 ProtectedRoute (登录检查)
      */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* 首页 */}
        <Route index element={<Home />} />

        {/* 业务子页面 */}
        <Route path="home" element={<Home />} />
        <Route path="blog" element={<BlogList />} />
        <Route path="blog/:id" element={<div>博客详情页（待开发）</div>} />
        <Route path="about" element={<About />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="mdx-showcase" element={<MDXShowcase />} />
        <Route path="test-highlight" element={<TestHighlight />} />
      </Route>

      {/* MDX 编辑器 - 全屏布局，不使用 Layout */}
      <Route
        path="mdx-editor"
        element={
          <ProtectedRoute>
            <MDXEditor />
          </ProtectedRoute>
        }
      />

      {/* 404 处理: 在主应用内部访问了不存在的路径 */}
      <Route
        path="*"
        element={
          <div className="text-muted-foreground flex h-[80vh] items-center justify-center">
            404 - 页面未找到
          </div>
        }
      />
    </Routes>
  );
}
