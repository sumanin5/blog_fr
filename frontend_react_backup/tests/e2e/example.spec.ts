/**
 * Playwright E2E 测试示例
 *
 * 这是一个示例，展示如何使用 Playwright 进行端到端测试。
 * 你可以删除这个文件，或者用它作为模板。
 *
 * 运行测试：npx playwright test
 * 调试模式：npx playwright test --debug
 * UI 模式：npx playwright test --ui
 */

import { test, expect } from "@playwright/test";

test.describe("首页测试", () => {
  test("页面应该正确加载", async ({ page }) => {
    // 访问首页
    await page.goto("http://localhost:5173");

    // 等待页面加载完成
    await page.waitForLoadState("networkidle");

    // 验证页面标题或关键元素存在
    // 根据你的实际页面内容修改这些断言
    await expect(page).toHaveTitle(/.*Blog.*/i);
  });

  test("导航链接应该可以点击", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // 示例：点击导航中的链接
    // 根据你的实际页面结构修改选择器
    // await page.getByRole('link', { name: '关于' }).click();
    // await expect(page).toHaveURL(/.*about.*/);
  });
});

test.describe("主题切换测试", () => {
  test("应该能够切换明暗主题", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // 示例：找到主题切换按钮并点击
    // 根据你的实际实现修改选择器
    // const themeToggle = page.getByRole('button', { name: /主题|theme/i });
    // await themeToggle.click();

    // 验证主题已切换（检查 html 或 body 的 class）
    // await expect(page.locator('html')).toHaveClass(/dark/);
  });
});

// 用户认证流程测试示例（需要后端配合）
test.describe("用户登录流程", () => {
  test.skip("用户应该能够登录", async ({ page }) => {
    await page.goto("http://localhost:5173/login");

    // 填写表单
    await page.getByLabel("邮箱").fill("test@example.com");
    await page.getByLabel("密码").fill("password123");

    // 点击登录按钮
    await page.getByRole("button", { name: "登录" }).click();

    // 验证登录成功（跳转到首页或显示用户信息）
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText("欢迎")).toBeVisible();
  });
});
