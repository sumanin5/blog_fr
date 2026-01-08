# 🚀 前端测试 - 快速参考

## 目前的项目状态

✅ **Vitest** 已配置（快速测试运行器）
✅ **React Testing Library** 已配置（组件测试）
✅ **Playwright** 已配置（E2E 测试）
✅ **测试文件位置**：

- 集成测试：`src/__tests__/pages/auth/Login.integration.test.tsx` ← 你现在在这里

---

## 🎯 今天的任务

### 1️⃣ 运行示例测试（5分钟）

```bash
cd frontend
npm run test
```

你应该看到：

```
✓ src/__tests__/pages/auth/Login.integration.test.tsx (7 tests)
  ✓ 页面加载与UI
  ✓ 表单输入
  ✓ 表单验证
  ...
```

### 2️⃣ 看着测试失败（5分钟）

故意修改一个测试：

```typescript
// 在 Login.integration.test.tsx 中找到这一行：
it("应该正确渲染登录表单", () => {
  renderLoginPage();
  expect(screen.getByText("登录")).toBeInTheDocument();
});

// 改成
expect(screen.getByText("注册")).toBeInTheDocument(); // ❌ 这会失败
```

再运行 `npm run test`，看看失败的样子。

### 3️⃣ 改回来（1分钟）

```typescript
expect(screen.getByText("登录")).toBeInTheDocument(); // ✅ 恢复
```

再运行 `npm run test`，看着测试通过。

---

## 📊 测试命令速查

```bash
# 基础命令
npm run test                    # 监听模式（推荐开发中使用）
npm run test:run                # 运行一次（CI/CD 用）
npm run test:coverage           # 生成覆盖率报告
npm run test:ui                 # 打开测试 UI 界面（很酷！）

# 特定文件
npm run test -- Login           # 只运行 Login 相关的测试
npm run test -- --reporter=verbose  # 详细输出

# E2E 测试
npm run test:e2e               # 运行 E2E 测试
npm run test:e2e:ui            # UI 模式
npm run test:e2e:debug         # 调试模式
```

---

## 🧪 测试文件结构

```typescript
import { describe, it, expect } from "vitest";

// 测试套件（describe 块）
describe("Login 页面", () => {

  // 单个测试用例（it 块）
  it("应该渲染登录表单", () => {
    // 准备 (Setup)
    render(<Login />);

    // 执行 (Act) 和验证 (Assert)
    expect(screen.getByText("登录")).toBeInTheDocument();
  });

  // 异步测试（需要 async）
  it("提交表单后应该导航", async () => {
    const user = userEvent.setup();
    render(<Login />);

    await user.type(screen.getByPlaceholderText(/账号/), "test");
    await user.click(screen.getByRole("button", { name: /登录/i }));

    expect(screen.getByText(/成功/)).toBeInTheDocument();
  });
});
```

---

## 🔍 选择器优先级（从好到差）

```typescript
// 1️⃣ 最好：按角色查找
screen.getByRole("button", { name: /login/i });

// 2️⃣ 次好：按标签查找
screen.getByLabelText(/username/i);

// 3️⃣ 可以：按文本查找
screen.getByText("Click me");

// 4️⃣ 一般：按占位符查找
screen.getByPlaceholderText(/enter name/i);

// 5️⃣ 最后才用：按 ID 查找
screen.getByTestId("submit-button");
```

---

## ⚙️ 常用用户操作

```typescript
const user = userEvent.setup();

// 输入
await user.type(input, "hello");

// 清空
await user.clear(input);

// 点击
await user.click(button);

// 选择
await user.selectOptions(select, "option1");

// 快捷键
await user.keyboard("{Enter}");
```

---

## ✅ 常用断言

```typescript
// 存在
expect(element).toBeInTheDocument();
expect(element).toBeVisible();

// 值
expect(input).toHaveValue("text");

// 状态
expect(button).toBeDisabled();
expect(input).toHaveFocus();

// 样式
expect(div).toHaveClass("active");

// 文本
expect(element).toHaveTextContent("hello");
```

---

## ⏱️ 异步处理

```typescript
import { waitFor } from "@testing-library/react";

// 等待元素出现
await waitFor(() => {
  expect(screen.getByText("Success")).toBeInTheDocument();
});

// 等待函数被调用
await waitFor(() => {
  expect(mockFn).toHaveBeenCalled();
});
```

---

## 🐛 调试技巧

```typescript
// 打印当前 DOM
screen.debug();

// 打印特定元素
screen.debug(element);

// 查看所有角色
screen.logTestingPlaygroundURL();

// 找不到元素时的详细信息
screen.getByText("xxx"); // 会打印所有可用的文本
```

---

## 📚 下一步

**现在就做**：

1. ✅ 运行 `npm run test`
2. ✅ 看着测试通过
3. ✅ 试试修改一个测试看它失败
4. ✅ 读一遍 `TESTING_GUIDE.md` 的第一部分

**明天**：

- 为 Register 组件写类似的集成测试
- 试试自己写一个新的测试用例

**这周**：

- 完成所有关键页面的集成测试
- 开始写 E2E 测试

---

## 💬 记住

> "好的测试就像好的文档 - 它告诉你代码应该做什么"

> "写测试不是为了 100% 覆盖率，而是为了有信心修改代码"

> "快速的反馈 > 完美的覆盖率"

---

**有问题？** 查看 `TESTING_GUIDE.md` 的常见问题部分或查阅官方文档。

Happy Testing! 🎉
