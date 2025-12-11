import { MDXProvider as BaseMDXProvider } from "@mdx-js/react";
import type { ReactNode } from "react";
import { components } from "./mdx-components-clean";

/**
 * 📦 MDX Provider 组件
 *
 * 包裹你的应用或 MDX 内容，提供自定义组件映射
 *
 * 使用方式：
 * ```tsx
 * <MDXProvider>
 *   <YourMDXContent />
 * </MDXProvider>
 * ```
 */
export function MDXProvider({ children }: { children: ReactNode }) {
  return <BaseMDXProvider components={components}>{children}</BaseMDXProvider>;
}
