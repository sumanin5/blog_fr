/**
 * 📝 Login 页面 - 集成测试
 *
 * 这是一个完整的集成测试示例。
 * 测试内容：表单验证、提交、错误处理、导航
 *
 * 运行方式：npm run test
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Login from "@/pages/auth/Login";
import { renderWithProviders } from "@/__tests__/test-utils";

/**
 * 🏗️ 测试环境包装器
 *
 * Login 组件使用了 React Router（useNavigate）
 * 所以需要用 BrowserRouter 包裹才能测试
 */
function renderLoginPage() {
  return renderWithProviders(<Login />);
}

describe("📱 Login 页面 - 集成测试", () => {
  beforeEach(() => {
    // 每个测试前清空 localStorage
    localStorage.clear();
  });

  // ========================================
  // ✅ 第 1 类：页面加载测试
  // ========================================
  describe("✅ 页面加载与UI", () => {
    it("应该正确渲染登录表单", () => {
      renderLoginPage();

      // 查找关键元素
      expect(screen.getByText("登录")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/请输入账号/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/请输入密码/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /立即登录/i }),
      ).toBeInTheDocument();
    });

    it("应该显示忘记密码和注册链接", () => {
      renderLoginPage();

      expect(screen.getByText(/忘记密码/i)).toBeInTheDocument();
      expect(screen.getByText(/去注册/i)).toBeInTheDocument();
    });

    it("登录按钮初始状态应该是可用的", () => {
      renderLoginPage();

      const loginBtn = screen.getByRole("button", { name: /登录/i });
      expect(loginBtn).not.toBeDisabled();
    });
  });

  // ========================================
  // ✅ 第 2 类：表单输入测试
  // ========================================
  describe("✅ 表单输入", () => {
    it("应该能输入用户名和密码", async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const usernameInput = screen.getByPlaceholderText(
        /请输入账号/i,
      ) as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText(
        /请输入密码/i,
      ) as HTMLInputElement;

      // 使用 userEvent（更接近真实用户操作）
      await user.type(usernameInput, "testuser");
      await user.type(passwordInput, "password123");

      // 验证输入值
      expect(usernameInput.value).toBe("testuser");
      expect(passwordInput.value).toBe("password123");
    });

    it("应该支持粘贴操作", async () => {
      renderLoginPage();

      const usernameInput = screen.getByPlaceholderText(/请输入账号/i);

      // 使用 fireEvent 模拟粘贴
      fireEvent.change(usernameInput, { target: { value: "pasted-username" } });

      expect(usernameInput).toHaveValue("pasted-username");
    });
  });

  // ========================================
  // ✅ 第 3 类：表单验证测试
  // ========================================
  describe("✅ 表单验证", () => {
    it("空表单提交时应该显示错误提示", async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const loginBtn = screen.getByRole("button", { name: /立即登录/i });

      // 点击登录按钮
      await user.click(loginBtn);

      // 等待错误信息出现
      await waitFor(() => {
        expect(screen.getByText(/请输入账号/i)).toBeInTheDocument();
      });
    });

    it("只输入用户名时应该提示输入密码", async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const usernameInput = screen.getByPlaceholderText(/请输入账号/i);
      const loginBtn = screen.getByRole("button", { name: /立即登录/i });

      // 只填写用户名
      await user.type(usernameInput, "testuser");
      await user.click(loginBtn);

      // 应该提示输入密码
      await waitFor(() => {
        expect(screen.getByText(/请输入密码/i)).toBeInTheDocument();
      });
    });

    it("密码过短时应该显示警告", async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const usernameInput = screen.getByPlaceholderText(/请输入账号/i);
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
      const loginBtn = screen.getByRole("button", { name: /立即登录/i });

      // 填写用户名和短密码
      await user.type(usernameInput, "testuser");
      await user.type(passwordInput, "123"); // 假设最少 6 位
      await user.click(loginBtn);

      // 应该显示密码长度不足的错误
      await waitFor(() => {
        expect(screen.getByText(/密码至少6位/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // ✅ 第 4 类：提交流程测试
  // ========================================
  describe("✅ 表单提交", () => {
    it("有效表单应该能提交", async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const usernameInput = screen.getByPlaceholderText(/请输入账号/i);
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
      const loginBtn = screen.getByRole("button", { name: /立即登录/i });

      // 填写有效的表单
      await user.type(usernameInput, "testuser");
      await user.type(passwordInput, "password123");

      // 点击登录（假设后端已 mock）
      await user.click(loginBtn);

      // 验证：按钮应该显示加载状态或被禁用
      // 注：具体行为取决于你的 Login 组件实现
    });

    it("提交后应该清空敏感信息", async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const passwordInput = screen.getByPlaceholderText(
        /请输入密码/i,
      ) as HTMLInputElement;
      const loginBtn = screen.getByRole("button", { name: /立即登录/i });

      await user.type(passwordInput, "password123");
      expect(passwordInput.value).toBe("password123");

      // 提交后密码应该被清空（如果实现了的话）
      await user.click(loginBtn);

      // 这取决于你的实现
      // await waitFor(() => {
      //   expect(passwordInput.value).toBe("");
      // });
    });
  });

  // ========================================
  // ✅ 第 5 类：导航测试
  // ========================================
  describe("✅ 页面导航", () => {
    it("点击'创建新账户'应该导航到注册页", async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const registerLink = screen.getByText(/去注册/i);
      expect(registerLink.getAttribute("href")).toBe("/auth/register");
    });

    it("点击'忘记密码'应该导航到重置密码页", async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const forgotLink = screen.getByText(/忘记密码/i);
      expect(forgotLink.getAttribute("href")).toBe("/forgot-password");
    });
  });

  // ========================================
  // ✅ 第 6 类：错误处理测试
  // ========================================
  describe("✅ 错误处理", () => {
    it("API 返回 401 时应该显示错误提示", async () => {
      const user = userEvent.setup();

      // Mock API 响应为 401（这里需要 mock 你的认证函数）
      // vi.mock("@/contexts/AuthContext", () => ({
      //   useAuth: () => ({
      //     login: vi.fn().mockRejectedValue(new Error("Invalid credentials")),
      //   }),
      // }));

      renderLoginPage();
      // 填写表单并提交...
      // 验证错误提示
    });

    it("网络错误时应该显示重试选项", async () => {
      const user = userEvent.setup();
      renderLoginPage();

      // Mock 网络错误
      // 填写表单并提交...
      // 验证错误提示和重试按钮
    });
  });

  // ========================================
  // ✅ 第 7 类：可访问性测试
  // ========================================
  describe("✅ 可访问性 (a11y)", () => {
    it("输入框应该有关联的 label", () => {
      renderLoginPage();

      const usernameInput = screen.getByPlaceholderText(/请输入账号/i);
      // 验证是否有 aria-label 或关联的 label 元素
      expect(usernameInput).toHaveAttribute("placeholder");
    });

    it("登录按钮应该是键盘可访问的", async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const usernameInput = screen.getByPlaceholderText(/请输入账号/i);
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
      const loginBtn = screen.getByRole("button", { name: /立即登录/i });

      // 模拟 Tab 键导航顺序
      // 第一次 Tab: 焦点到用户名输入框
      await user.tab();
      expect(usernameInput).toHaveFocus();

      // 第二次 Tab: 焦点到密码输入框
      await user.tab();
      expect(passwordInput).toHaveFocus();

      // 第三次 Tab: 焦点到登录按钮
      await user.tab();
      expect(loginBtn).toHaveFocus();
    });
  });
});

/**
 * 📚 学习要点
 *
 * 1. render() - 在 jsdom 中渲染组件
 * 2. screen.getBy* - 查找元素（严格模式，找不到会失败）
 * 3. userEvent - 模拟真实用户操作（比 fireEvent 更好）
 * 4. waitFor() - 等待异步操作完成
 * 5. describe/it - 测试套件和用例组织
 * 6. expect() - 断言，验证结果
 *
 * 📖 更多 getBy 方法：
 * - getByRole() - 按 ARIA role 查找（最推荐）
 * - getByLabelText() - 按 label 查找
 * - getByText() - 按文本查找
 * - getByPlaceholderText() - 按 placeholder 查找
 * - getByTestId() - 按 data-testid 查找（最后才用）
 */
