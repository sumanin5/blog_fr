/**
 * 🧪 测试工具函数
 *
 * 提供在所有提供者（Provider）包裹下渲染组件的便利函数。
 * 所有需要 AuthProvider、ThemeProvider、BrowserRouter 的组件测试
 * 都应该使用这个函数。
 *
 * @example
 * ```tsx
 * import { renderWithProviders } from "@/__tests__/test-utils";
 * import { screen } from "@testing-library/react";
 * import Login from "@/pages/auth/Login";
 *
 * describe("Login", () => {
 *   it("should render login form", () => {
 *     renderWithProviders(<Login />);
 *     expect(screen.getByText("登录")).toBeInTheDocument();
 *   });
 * });
 * ```
 */

import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { AllTheProviders } from "./providers/AllTheProviders";

/**
 * 便利函数：在所有提供者下渲染组件
 *
 * @param ui - 要渲染的 React 元素
 * @returns render 函数的返回值（包含 screen, rerender 等）
 */
export function renderWithProviders(ui: ReactElement) {
  return render(ui, { wrapper: AllTheProviders });
}
