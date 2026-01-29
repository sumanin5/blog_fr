import "@testing-library/jest-dom";
import { vi } from "vitest";

// 1. 设置测试环境变量 (指向测试后端)
process.env.NEXT_PUBLIC_API_URL = "http://localhost:8001";

// 2. Mock next/navigation (路由相关组件仍需 Mock)
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// 3. 补充 JSDOM 缺失的 API
if (!global.crypto) {
  Object.defineProperty(global, "crypto", {
    value: {
      randomUUID: () => "test-uuid-1234",
    },
  });
}
