import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

/**
 * Vitest 配置文件
 *
 * 说明：
 * - 继承 Vite 配置（共享 alias、plugins 等）
 * - 使用 jsdom 模拟浏览器环境
 * - setupFiles 用于设置全局测试配置（如 jest-dom 的扩展断言）
 *
 * 目录结构：
 * - src/__tests__/         组件和 Hook 的集成测试
 * - tests/e2e/             Playwright E2E 测试（由 playwright.config.ts 管理）
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // 使用 jsdom 模拟浏览器 DOM 环境
      environment: "jsdom",

      // 全局设置文件，在每个测试文件运行前执行
      setupFiles: ["./src/__tests__/setup.ts"],

      // 测试文件匹配模式
      include: ["src/**/*.{test,spec}.{ts,tsx}"],

      // 排除 Playwright E2E 测试（它们有自己的配置）
      exclude: ["node_modules", "tests/e2e/**"],

      // 全局变量（使 describe, it, expect 等无需 import）
      globals: true,

      // 测试环境变量
      env: {
        // API 基础 URL（用于 API 客户端）
        VITE_API_URL: "http://localhost:8000",
        // 测试环境标识
        NODE_ENV: "test",
      },

      // 覆盖率报告配置
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        exclude: [
          "node_modules/",
          "src/__tests__/",
          "**/*.d.ts",
          "**/*.config.*",
        ],
      },
    },
  }),
);
