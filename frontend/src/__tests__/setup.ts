/**
 * Vitest 测试环境设置文件
 *
 * 此文件在每个测试文件运行前自动执行。
 * 主要用于：
 * 1. 扩展 Vitest 的断言方法（来自 @testing-library/jest-dom）
 * 2. 设置全局 Mock
 * 3. 清理每个测试后的副作用
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 每个测试结束后自动清理 DOM
// 这确保测试之间相互隔离，不会相互影响
afterEach(() => {
  cleanup();
});

// 常用 Mock 示例（按需取消注释）
// ----------------------------------------------------------------

// Mock window.matchMedia（用于响应式组件测试）
// Object.defineProperty(window, "matchMedia", {
//   writable: true,
//   value: vi.fn().mockImplementation((query) => ({
//     matches: false,
//     media: query,
//     onchange: null,
//     addListener: vi.fn(),
//     removeListener: vi.fn(),
//     addEventListener: vi.fn(),
//     removeEventListener: vi.fn(),
//     dispatchEvent: vi.fn(),
//   })),
// });

// Mock IntersectionObserver（用于懒加载、无限滚动等）
// class MockIntersectionObserver {
//   observe = vi.fn();
//   disconnect = vi.fn();
//   unobserve = vi.fn();
// }
// Object.defineProperty(window, "IntersectionObserver", {
//   writable: true,
//   value: MockIntersectionObserver,
// });
