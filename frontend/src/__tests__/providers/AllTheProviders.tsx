/**
 * 🎁 所有全局提供者的包装组件
 *
 * 这是一个包装组件，提供测试所需的所有全局提供者：
 * - ThemeProvider (主题切换)
 * - AuthProvider (认证状态)
 * - BrowserRouter (路由)
 *
 * 层级结构：
 * ```
 * ThemeProvider
 *   └─ AuthProvider
 *      └─ BrowserRouter
 *         └─ 被测试的组件
 * ```
 */

import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/shared/contexts";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";

interface AllTheProvidersProps {
  children: React.ReactNode;
}

/**
 * 提供所有全局上下文的包装组件
 *
 * 在测试中使用这个组件来包裹被测试的组件，确保所有必要的
 * Provider 都可用。
 *
 * @example
 * ```tsx
 * render(
 *   <AllTheProviders>
 *     <MyComponent />
 *   </AllTheProviders>
 * );
 * ```
 */
export function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="my-blog-theme">
      <AuthProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
