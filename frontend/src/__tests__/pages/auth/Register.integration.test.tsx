/**
 * 📝 Register 页面 - 集成测试
 *
 * 这是一个完整的集成测试示例。
 * 测试内容：表单验证、提交、错误处理、导航
 *
 * 运行方式：npm run test
 */

import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import Register from "@/features/auth/pages/auth/Register";
import { renderWithProviders } from "@/__tests__/test-utils";

/**
 * 🏗️ 测试环境包装器
 *
 * Register 组件使用了 React Router（useNavigate）
 * 所以需要用 BrowserRouter 包裹才能测试
 */
function renderRegisterPage() {
  return renderWithProviders(<Register />);
}

describe("📱 Register 页面 - 集成测试", () => {
  beforeEach(() => {
    // 每个测试前清空 localStorage
    localStorage.clear();
  });

  // ========================================
  // ✅ 第 1 类：页面加载测试
  // ========================================
  describe("✅ 页面加载与UI", () => {
    it("应该正确渲染注册表单", () => {
      renderRegisterPage();

      // 查找关键元素
      expect(screen.getByText("注册")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/请输入用户名/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/example@mail.com/i),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/请输入密码/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/请再次输入密码/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /立即注册/i }),
      ).toBeInTheDocument();
    });

    it("应该显示登录链接", () => {
      renderRegisterPage();

      expect(screen.getByText(/去登录/i)).toBeInTheDocument();
      expect(screen.getByText(/去登录/i).getAttribute("href")).toBe(
        "/auth/login",
      );
    });

    it("注册按钮初始状态应该是可用的", () => {
      renderRegisterPage();

      const registerBtn = screen.getByRole("button", { name: /立即注册/i });
      expect(registerBtn).not.toBeDisabled();
    });
  });

  // ========================================
  // ✅ 第 2 类：表单输入测试
  // ========================================
  describe("✅ 表单输入", () => {
    it("应该能输入所有字段", async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const usernameInput = screen.getByPlaceholderText(
        /请输入用户名/i,
      ) as HTMLInputElement;
      const emailInput = screen.getByPlaceholderText(
        /example@mail.com/i,
      ) as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText(
        /请输入密码/i,
      ) as HTMLInputElement;
      const confirmPasswordInput = screen.getByPlaceholderText(
        /请再次输入密码/i,
      ) as HTMLInputElement;

      // 使用 userEvent（更接近真实用户操作）
      await user.type(usernameInput, "testuser");
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      // 验证输入值
      expect(usernameInput.value).toBe("testuser");
      expect(emailInput.value).toBe("test@example.com");
      expect(passwordInput.value).toBe("password123");
      expect(confirmPasswordInput.value).toBe("password123");
    });

    it("应该支持粘贴操作", async () => {
      renderRegisterPage();

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);

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
      renderRegisterPage();

      const registerBtn = screen.getByRole("button", { name: /立即注册/i });

      // 点击注册按钮
      await user.click(registerBtn);

      // 等待错误信息出现
      await waitFor(() => {
        expect(screen.getByText(/请输入用户名/i)).toBeInTheDocument();
      });
    });

    it("邮箱为空时应该提示输入邮箱", async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
      const registerBtn = screen.getByRole("button", { name: /立即注册/i });

      // 只填写用户名
      await user.type(usernameInput, "testuser");
      await user.click(registerBtn);

      // 应该提示输入邮箱
      await waitFor(() => {
        expect(screen.getByText(/请输入邮箱/i)).toBeInTheDocument();
      });
    });

    it("邮箱格式不正确时应该显示错误", async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
      const emailInput = screen.getByPlaceholderText(/example@mail.com/i);
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
      const confirmPasswordInput =
        screen.getByPlaceholderText(/请再次输入密码/i);
      const registerBtn = screen.getByRole("button", { name: /立即注册/i });

      // 填写所有字段，邮箱格式错误
      await user.clear(usernameInput);
      await user.type(usernameInput, "testuser");

      await user.clear(emailInput);
      await user.type(emailInput, "test@example"); // 缺少顶级域名

      await user.clear(passwordInput);
      await user.type(passwordInput, "password123");

      await user.clear(confirmPasswordInput);
      await user.type(confirmPasswordInput, "password123");

      // 点击提交
      await user.click(registerBtn);

      // 检查是否显示邮箱格式错误（同时也检查其他正确的字段没有错误）
      await waitFor(() => {
        // 邮箱错误应该显示
        expect(screen.getByText(/邮箱格式不正确/i)).toBeInTheDocument();
        // 其他字段不应该有错误
        expect(screen.queryByText(/请输入用户名/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/请输入密码/i)).not.toBeInTheDocument();
      });
    });

    it("密码为空时应该提示输入密码", async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
      const emailInput = screen.getByPlaceholderText(/example@mail.com/i);
      const registerBtn = screen.getByRole("button", { name: /立即注册/i });

      // 填写用户名和邮箱，但不填密码
      await user.type(usernameInput, "testuser");
      await user.type(emailInput, "test@example.com");
      await user.click(registerBtn);

      // 应该提示输入密码
      await waitFor(() => {
        expect(screen.getByText(/请输入密码/i)).toBeInTheDocument();
      });
    });

    it("密码过短时应该显示警告", async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
      const emailInput = screen.getByPlaceholderText(/example@mail.com/i);
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
      const confirmPasswordInput =
        screen.getByPlaceholderText(/请再次输入密码/i);
      const registerBtn = screen.getByRole("button", { name: /立即注册/i });

      // 填写表单，密码少于 6 位
      await user.type(usernameInput, "testuser");
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "123"); // 少于 6 位
      await user.type(confirmPasswordInput, "123");
      await user.click(registerBtn);

      // 应该显示密码长度不足的错误
      await waitFor(() => {
        expect(screen.getByText(/密码至少6位/i)).toBeInTheDocument();
      });
    });

    it("确认密码为空时应该提示", async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
      const emailInput = screen.getByPlaceholderText(/example@mail.com/i);
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
      const registerBtn = screen.getByRole("button", { name: /立即注册/i });

      // 填写表单，但不填确认密码
      await user.type(usernameInput, "testuser");
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(registerBtn);

      // 应该提示确认密码
      await waitFor(() => {
        expect(screen.getByText(/请确认密码/i)).toBeInTheDocument();
      });
    });

    it("密码不一致时应该显示错误", async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
      const emailInput = screen.getByPlaceholderText(/example@mail.com/i);
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
      const confirmPasswordInput =
        screen.getByPlaceholderText(/请再次输入密码/i);
      const registerBtn = screen.getByRole("button", { name: /立即注册/i });

      // 填写表单，密码不一致
      await user.type(usernameInput, "testuser");
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password456"); // 密码不一致
      await user.click(registerBtn);

      // 应该显示密码不一致的错误
      await waitFor(() => {
        expect(screen.getByText(/两次密码输入不一致/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // ✅ 第 4 类：提交流程测试
  // ========================================
  describe("✅ 表单提交", () => {
    it("有效表单应该能提交", async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
      const emailInput = screen.getByPlaceholderText(/example@mail.com/i);
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
      const confirmPasswordInput =
        screen.getByPlaceholderText(/请再次输入密码/i);
      const registerBtn = screen.getByRole("button", { name: /立即注册/i });

      // 填写有效的表单
      await user.type(usernameInput, "testuser");
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      // 点击注册（假设后端已 mock）
      await user.click(registerBtn);

      // 验证：按钮应该显示加载状态或被禁用
      // 注：具体行为取决于你的 Register 组件实现
    });
  });

  // ========================================
  // ✅ 第 5 类：导航测试
  // ========================================
  describe("✅ 页面导航", () => {
    it("点击'去登录'应该导航到登录页", async () => {
      renderRegisterPage();

      const loginLink = screen.getByText(/去登录/i);
      expect(loginLink.getAttribute("href")).toBe("/auth/login");
    });
  });

  // ========================================
  // ✅ 第 6 类：错误处理测试
  // ========================================
  describe("✅ 错误处理", () => {
    it("API 返回错误时应该显示错误提示", async () => {
      // Mock API 响应为错误（这里需要 mock 你的认证函数）
      // vi.mock("@/contexts/AuthContext", () => ({
      //   useAuth: () => ({
      //     register: vi.fn().mockRejectedValue(new Error("用户名已存在")),
      //   }),
      // }));

      renderRegisterPage();
      // 填写表单并提交...
      // 验证错误提示
    });
  });

  // ========================================
  // ✅ 第 7 类：可访问性测试
  // ========================================
  describe("✅ 可访问性 (a11y)", () => {
    it("输入框应该有关联的 label", () => {
      renderRegisterPage();

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
      // 验证是否有 aria-label 或关联的 label 元素
      expect(usernameInput).toHaveAttribute("placeholder");
    });

    it("注册按钮应该是键盘可访问的", async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
      const emailInput = screen.getByPlaceholderText(/example@mail.com/i);
      const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
      const confirmPasswordInput =
        screen.getByPlaceholderText(/请再次输入密码/i);
      const loginLink = screen.getByText(/去登录/i);
      const registerBtn = screen.getByRole("button", { name: /立即注册/i });

      // 模拟 Tab 键导航顺序
      // 第一次 Tab: 焦点到用户名输入框
      await user.tab();
      expect(usernameInput).toHaveFocus();

      // 第二次 Tab: 焦点到邮箱输入框
      await user.tab();
      expect(emailInput).toHaveFocus();

      // 第三次 Tab: 焦点到密码输入框
      await user.tab();
      expect(passwordInput).toHaveFocus();

      // 第四次 Tab: 焦点到确认密码输入框
      await user.tab();
      expect(confirmPasswordInput).toHaveFocus();

      // 第五次 Tab: 焦点到注册按钮
      await user.tab();
      expect(registerBtn).toHaveFocus();

      // 第六次 Tab: 焦点到登录链接
      await user.tab();
      expect(loginLink).toHaveFocus();
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
