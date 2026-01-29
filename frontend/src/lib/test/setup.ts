import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API client
vi.mock("@/shared/api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/shared/api")>();
  return {
    ...mod,
    logAnalyticsEvent: vi.fn(),
    client: {
      getConfig: () => ({ baseUrl: "http://localhost:8000" }),
    },
  };
});

// Mock crypto.randomUUID
if (!global.crypto) {
  Object.defineProperty(global, "crypto", {
    value: {
      randomUUID: () => "test-uuid-1234",
    },
  });
}
