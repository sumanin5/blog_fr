import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/shared/components/common";
import MDXShowcase from "@/features/mdx/pages/MDXShowcase";
import MDXEditor from "@/features/mdx/pages/MDXEditor";
import MDXTestClean from "@/features/mdx/pages/MDXTestClean";

/**
 * MDX 模块路由
 * 路径：/mdx -> /mdx/showcase（默认）
 *      /mdx/showcase, /mdx/editor（需要登录）
 */
export const mdxRoutes = (
  <>
    {/* 默认路由：/mdx 重定向到 /mdx/showcase */}
    <Route index element={<Navigate to="showcase" replace />} />

    <Route path="showcase" element={<MDXShowcase />} />
    <Route path="test-clean" element={<MDXTestClean />} />
    <Route
      path="editor"
      element={
        <ProtectedRoute>
          <MDXEditor />
        </ProtectedRoute>
      }
    />
  </>
);
