import { Route } from "react-router-dom";
import BlogList from "@/pages/blog/BlogList";
import BlogDetail from "@/pages/blog/BlogDetail";

/**
 * 博客模块路由
 * 路径：/blog, /blog/:id
 */
export const blogRoutes = (
  <>
    <Route index element={<BlogList />} />
    <Route path=":id" element={<BlogDetail />} />
  </>
);
