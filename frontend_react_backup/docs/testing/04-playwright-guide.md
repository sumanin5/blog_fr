# Playwright E2E 测试完整指南

## 1. 什么是 Playwright？

Playwright 是微软开发的 E2E 测试框架，用于在真实浏览器中测试完整的用户流程。

**特点**：

- 🌐 跨浏览器：Chrome、Firefox、Safari
- ⚡ 自动等待：智能等待元素可用
- 🎬 调试神器：视频录制、截图、Trace Viewer
- 📱 移动端模拟

---

## 2. 配置说明

### playwright.config.ts

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
```

---

## 3. 运行测试

```bash
# 先启动开发服务器
npm run dev

# 运行所有 E2E 测试
npm run test:e2e

# UI 模式（推荐新手）
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug

# 只运行 chromium
npx playwright test --project=chromium

# 运行特定文件
npx playwright test login.spec.ts
```

---

## 4. 编写测试

### 基本结构

```typescript
import { test, expect } from "@playwright/test";

test.describe("登录功能", () => {
  test("用户可以登录", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("邮箱").fill("user@example.com");
    await page.getByLabel("密码").fill("password");
    await page.getByRole("button", { name: "登录" }).click();

    await expect(page).toHaveURL("/dashboard");
  });
});
```

---

## 5. 定位元素

### 推荐的定位器

```typescript
// 按角色（最推荐）
page.getByRole("button", { name: "提交" });
page.getByRole("link", { name: "首页" });
page.getByRole("textbox", { name: "邮箱" });

// 按标签
page.getByLabel("用户名");

// 按文本
page.getByText("欢迎回来");

// 按占位符
page.getByPlaceholder("请输入邮箱");

// CSS 选择器（最后手段）
page.locator(".submit-btn");
page.locator('[data-testid="submit"]');
```

---

## 6. 用户操作

```typescript
// 点击
await page.getByRole("button").click();

// 填写表单
await page.getByLabel("邮箱").fill("test@test.com");

// 清空再填写
await page.getByLabel("邮箱").clear();
await page.getByLabel("邮箱").fill("new@test.com");

// 按键
await page.keyboard.press("Enter");
await page.keyboard.type("Hello");

// 选择下拉框
await page.getByRole("combobox").selectOption("value");

// 勾选复选框
await page.getByRole("checkbox").check();
```

---

## 7. 断言

```typescript
// 页面断言
await expect(page).toHaveURL("/dashboard");
await expect(page).toHaveTitle(/Blog/);

// 元素断言
await expect(page.getByText("欢迎")).toBeVisible();
await expect(page.getByRole("button")).toBeEnabled();
await expect(page.getByRole("button")).toBeDisabled();
await expect(page.getByRole("textbox")).toHaveValue("test@test.com");
await expect(page.getByRole("textbox")).toBeEmpty();

// 元素不存在
await expect(page.getByText("错误")).not.toBeVisible();
```

---

## 8. 等待

```typescript
// 等待导航
await page.waitForURL("/dashboard");

// 等待元素
await page.waitForSelector(".loading");

// 等待请求
await page.waitForResponse("/api/users");

// 等待加载完成
await page.waitForLoadState("networkidle");
```

---

## 9. 调试技巧

### 使用 Codegen 自动生成代码

```bash
npx playwright codegen http://localhost:5173
```

这会打开浏览器，你的每个操作都会自动转换成代码。

### 使用 UI 模式

```bash
npx playwright test --ui
```

### 使用 Trace Viewer

测试失败后查看详细轨迹：

```bash
npx playwright show-trace trace.zip
```

### 调试单个测试

```bash
npx playwright test login.spec.ts --debug
```

---

## 10. 常见测试场景

### 登录流程

```typescript
test("用户登录", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("user@test.com");
  await page.getByLabel("密码").fill("password123");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByText("欢迎回来")).toBeVisible();
});
```

### 表单验证

```typescript
test("显示验证错误", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "注册" }).click();

  await expect(page.getByText("邮箱不能为空")).toBeVisible();
});
```

### 主题切换

```typescript
test("切换深色模式", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /主题/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
```

---

## 11. 最佳实践

- ✅ 使用 `getByRole` 优先定位
- ✅ 利用 Codegen 生成初始代码
- ✅ 测试关键业务流程
- ✅ 使用 `expect` 的自动等待
- ❌ 不要用 `page.waitForTimeout()`
- ❌ 不要测试每个小功能

---

## 12. 文件结构

```
tests/
└── e2e/
    ├── auth.spec.ts      # 认证相关
    ├── blog.spec.ts      # 博客功能
    └── theme.spec.ts     # 主题切换
```
