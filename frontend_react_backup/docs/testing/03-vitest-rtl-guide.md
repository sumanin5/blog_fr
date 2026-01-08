# Vitest + React Testing Library 完整指南

## 1. 概述

**Vitest** 是测试运行器，负责执行测试并报告结果。
**React Testing Library (RTL)** 是测试工具库，负责渲染组件和模拟用户交互。

---

## 2. 配置说明

### 2.1 vitest.config.ts

```typescript
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom", // 模拟浏览器 DOM
      setupFiles: ["./src/__tests__/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      globals: true,
    },
  }),
);
```

### 2.2 setup.ts

```typescript
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

---

## 3. 运行测试

```bash
npm test           # Watch 模式
npm run test:run   # 单次运行
npm run test:ui    # UI 界面
npm run test:coverage  # 覆盖率
```

---

## 4. 查询元素

### 优先级

1. `getByRole` - 最推荐，基于可访问性
2. `getByLabelText` - 表单元素
3. `getByText` - 非交互文本
4. `getByTestId` - 最后手段

### 查询变体

| 前缀      | 不存在时 | 多个时 | 异步 |
| --------- | -------- | ------ | ---- |
| `getBy`   | 抛错     | 抛错   | 同步 |
| `queryBy` | null     | 抛错   | 同步 |
| `findBy`  | 抛错     | 抛错   | 异步 |

---

## 5. 用户交互

```typescript
import userEvent from "@testing-library/user-event";

const user = userEvent.setup();

await user.click(button);
await user.type(input, "text");
await user.keyboard("{Enter}");
await user.tab();
```

---

## 6. 断言

```typescript
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveTextContent("Hello");
expect(element).toHaveClass("active");
expect(element).toBeDisabled();
```

---

## 7. 常见模式

### 测试表单

```typescript
it("提交表单", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();

  render(<Form onSubmit={onSubmit} />);
  await user.type(screen.getByLabelText("邮箱"), "test@test.com");
  await user.click(screen.getByRole("button", { name: "提交" }));

  expect(onSubmit).toHaveBeenCalled();
});
```

### 测试条件渲染

```typescript
it("loading 显示加载器", () => {
  render(<Component loading={true} />);
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
});
```

---

## 8. 调试

```typescript
screen.debug(); // 打印 DOM
logRoles(container); // 查看可用 role
```

---

## 9. 最佳实践

- ✅ 使用 `getByRole` 优先
- ✅ 使用 `userEvent` 而非 `fireEvent`
- ✅ 测试用户行为，不测实现细节
- ❌ 不要测试组件内部状态
