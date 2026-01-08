# 集成测试 vs E2E 测试 - 环境配置指南

## 概述

本文档解释了集成测试和 E2E 测试在环境配置方面的不同需求，以及为什么集成测试通常不需要环境变量配置。

## 测试类型对比

### 集成测试 (Integration Tests)

- **位置**: `frontend/src/__tests__/`
- **工具**: Vitest + Testing Library
- **环境**: jsdom (模拟浏览器)
- **API**: Mock 函数
- **数据库**: 不涉及
- **速度**: 快 (毫秒级)

### E2E 测试 (End-to-End Tests)

- **位置**: `frontend/tests/e2e/`
- **工具**: Playwright
- **环境**: 真实浏览器
- **API**: 真实后端服务
- **数据库**: 真实数据库
- **速度**: 慢 (秒级)

## 环境变量需求

### 集成测试：需要少量环境变量

**原因**：

1. **API 客户端配置**：需要 `VITE_API_URL` 来构建 API 请求 URL
2. **组件依赖**：某些组件可能直接读取环境变量
3. **测试环境标识**：`NODE_ENV=test` 用于区分测试环境

**注意**：虽然集成测试通常使用 Mock，但当组件直接依赖环境变量时仍需配置。

**示例**：

```typescript
// ❌ 集成测试中不应该这样做
const response = await fetch("http://localhost:8000/users/login", {
  method: "POST",
  body: formData,
});

// ✅ 集成测试中应该这样做
const mockLogin = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin }),
}));
```

### E2E 测试：需要环境变量

**原因**：

1. **真实 API 调用**：需要连接真实后端
2. **数据清理**：需要管理员权限清理测试数据
3. **环境隔离**：不同环境可能有不同的凭据

**示例**：

```typescript
// ✅ E2E 测试中需要真实凭据
const adminUsername = process.env.TEST_ADMIN_USERNAME || "admin";
const adminPassword = process.env.TEST_ADMIN_PASSWORD || "1234";
```

## 集成测试的 Mock 策略

### 1. Mock AuthContext

```typescript
// frontend/src/__tests__/pages/auth/Login.test.tsx
import { vi } from "vitest";

// Mock 整个 AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn(),
    loading: false,
  }),
}));
```

### 2. Mock API Client

```typescript
// Mock API 客户端
vi.mock("@/api/client", () => ({
  apiClient: {
    users: {
      login: vi.fn().mockResolvedValue({
        data: { access_token: "mock-token" },
      }),
    },
  },
}));
```

### 3. Mock 环境变量（如果需要）

```typescript
// 如果组件中使用了环境变量
vi.stubEnv("VITE_API_URL", "http://mock-api.com");
```

## 何时需要在集成测试中配置环境变量？

### 需要的情况（少见）：

1. **组件直接读取环境变量**

```typescript
// 如果组件中有这样的代码
const apiUrl = import.meta.env.VITE_API_URL;
```

2. **测试不同环境的行为**

```typescript
// 测试开发环境 vs 生产环境的不同行为
it("should show debug info in development", () => {
  vi.stubEnv("NODE_ENV", "development");
  // ... 测试逻辑
});
```

### 不需要的情况（常见）：

1. **纯 UI 组件测试**
2. **表单验证测试**
3. **路由导航测试**
4. **状态管理测试**

## 当前项目的配置建议

### Vitest 配置 (已配置环境变量)

当前的 `vitest.config.ts` 配置包含必要的环境变量：

```typescript
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/__tests__/setup.ts"],
      globals: true,
      // 测试环境变量
      env: {
        // API 基础 URL（用于 API 客户端）
        VITE_API_URL: "http://localhost:8000",
        // 测试环境标识
        NODE_ENV: "test",
      },
    },
  }),
);
```

### 如果确实需要环境变量

可以在 `vitest.config.ts` 中添加：

```typescript
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/__tests__/setup.ts"],
      globals: true,
      env: {
        // 测试专用的环境变量
        VITE_API_URL: "http://mock-api.com",
        NODE_ENV: "test",
      },
    },
  }),
);
```

## 测试策略总结

### 集成测试策略

- ✅ Mock 外部依赖 (API、LocalStorage)
- ✅ 测试组件交互和状态变化
- ✅ 验证表单验证逻辑
- ✅ 测试路由导航
- ❌ 不发送真实网络请求
- ❌ 不依赖真实后端服务

### E2E 测试策略

- ✅ 使用真实后端服务
- ✅ 测试完整用户流程
- ✅ 验证跨系统集成
- ✅ 需要环境变量配置
- ❌ 不测试单个组件细节

## 相关文件

- `frontend/vitest.config.ts` - Vitest 配置
- `frontend/src/__tests__/setup.ts` - 测试环境设置
- `frontend/src/__tests__/test-utils.tsx` - 测试工具函数
- `frontend/src/__tests__/providers/AllTheProviders.tsx` - Provider 包装器
- `frontend/playwright.config.ts` - E2E 测试配置 (需要环境变量)
- `.env` - 环境变量配置 (主要用于 E2E 测试)
