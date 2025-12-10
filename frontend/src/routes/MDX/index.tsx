import { Route } from "react-router-dom";
import MDXShowcase from "@/pages/mdx/MDXShowcase";
import MDXEditor from "@/pages/mdx/MDXEditor";

/**
 * MDX 模块路由
 * 路径：/mdx-showcase, /mdx-editor
 */
export const mdxRoutes = (
  <>
    <Route path="mdx-showcase" element={<MDXShowcase />} />
    <Route path="mdx-editor" element={<MDXEditor />} />
  </>
);
