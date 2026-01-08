/**
 * ========================================================================
 * 🧪 端到端 (E2E) 测试 - 用户认证流程
 * ========================================================================
 *
 * 【什么是 E2E 测试？】
 * E2E (End-to-End) 测试是模拟真实用户在浏览器中的完整操作流程。
 * 与单元测试和集成测试不同，E2E 测试会：
 * 1. 启动真实的浏览器（Chrome、Firefox 等）
 * 2. 访问真实的前端应用（运行在 localhost:5173）
 * 3. 调用真实的后端 API（运行在 localhost:8000）
 * 4. 模拟用户点击、输入、导航等操作
 * 5. 验证页面上显示的内容和 URL 变化
 *
 * 【Playwright 是什么？】
 * Playwright 是微软开发的浏览器自动化工具，可以：
 * - 控制浏览器执行操作（点击、输入、滚动等）
 * - 等待页面加载和元素出现
 * - 截图和录制视频
 * - 支持 Chrome、Firefox、Safari、Edge 等多种浏览器
 *
 * 【测试流程】
 * 1. beforeEach: 每个测试开始前清理环境（删除 cookies 和 localStorage）
 * 2. test: 执行具体的测试场景
 * 3. expect: 验证结果是否符合预期
 * 4. afterEach: 测试结束后可以做清理工作（可选）
 *
 * 【本文件测试的功能】
 * - 用户注册
 * - 用户登录
 * - 用户登出
 * - 受保护页面的访问控制
 *
 * ========================================================================
 */

import { test, expect, type Page } from "@playwright/test";

/**
 * ========================================================================
 * 📦 测试配置和工具函数
 * ========================================================================
 */

/**
 * 【测试数据类型定义】
 * TypeScript 的接口定义，确保类型安全
 */
interface TestUser {
  username: string; // 用户名
  email: string; // 邮箱
  password: string; // 密码
}

/**
 * 【辅助函数 1：创建唯一测试用户】
 *
 * 为什么使用 Date.now()？
 * - 每次运行测试都生成唯一的用户名和邮箱
 * - 避免与数据库中已存在的用户冲突
 * - 可以重复运行测试而不需要手动清理数据库
 *
 * Date.now() 返回什么？
 * - 返回当前时间的毫秒数，例如：1702123456789
 * - 这个数字每毫秒都在增加，确保唯一性
 *
 * 示例输出：
 * - username: "testuser_1702123456789"
 * - email: "testuser_1702123456789@example.com"
 * - password: "Test123456"
 */
function createTestUser(): TestUser {
  const timestamp = Date.now(); // 获取当前时间戳

  return {
    username: `testuser_${timestamp}`,
    email: `testuser_${timestamp}@example.com`,
    password: "Test123456", // 固定密码，满足安全要求
  };
}

/**
 * 【辅助函数 2：清除浏览器存储】
 *
 * 为什么需要这个函数？
 * - Web 应用通常把登录凭证存储在 localStorage 中（例如 access_token）
 * - 如果不清除，上一个测试的登录状态会影响下一个测试
 * - 确保每个测试都从"未登录"状态开始
 *
 * localStorage 是什么？
 * - 浏览器提供的本地存储 API，即使关闭浏览器数据也不会丢失
 * - 我们的应用用它保存 JWT token：localStorage.setItem("access_token", token)
 *
 * 为什么用 try-catch？
 * - 某些环境（如 file:// 协议、跨域页面）可能禁止访问 localStorage
 * - 捕获异常可以防止测试因为意外错误而失败
 *
 * page.evaluate() 是什么？
 * - Playwright 提供的方法，在浏览器上下文中执行 JavaScript 代码
 * - 就像在浏览器的开发者工具 Console 中输入代码一样
 *
 * 参数说明：
 * @param page - Playwright 的 Page 对象，代表一个浏览器标签页
 * @returns Promise<void> - 异步函数，返回空
 */
async function clearBrowserStorage(page: Page): Promise<void> {
  // 在浏览器上下文中执行清理代码
  await page.evaluate(() => {
    try {
      // 清除 localStorage 中的所有键值对
      localStorage.clear();

      // 清除 sessionStorage（会话存储，关闭浏览器后自动清除）
      sessionStorage.clear();
    } catch (error) {
      // 如果清除失败，只打印警告，不中断测试
      console.warn("清除浏览器存储失败:", error);
    }
  });
}

/**
 * 【辅助函数 3：用户注册流程】
 *
 * 为什么要封装成函数？
 * - 多个测试用例都需要"注册用户"这个步骤
 * - 如果在每个测试中重复写，代码会非常冗余
 * - 如果页面 UI 改变（比如按钮文本变了），只需修改这一个函数
 *
 * 函数作用：
 * - 自动完成整个注册流程：导航 → 填表 → 提交 → 验证
 *
 * 函数流程：
 * 1. 跳转到注册页面
 * 2. 填写用户名、邮箱、密码、确认密码
 * 3. 点击注册按钮
 * 4. 等待重定向到登录页（注册成功的标志）
 *
 * Playwright 选择器说明：
 * - getByLabel(): 通过 <label> 标签的文本查找输入框（推荐，符合无障碍标准）
 * - getByRole(): 通过 ARIA role 查找元素（如 button、link）
 * - 正则表达式 /用户名|账号/i：匹配"用户名"或"账号"，i 表示不区分大小写
 *
 * 参数说明：
 * @param page - Playwright 的 Page 对象
 * @param user - 包含用户信息的对象（username, email, password）
 * @returns Promise<void>
 */
async function registerUser(page: Page, user: TestUser): Promise<void> {
  // 步骤 1：导航到注册页面
  // page.goto() 就像在浏览器地址栏输入 URL 并按回车
  await page.goto("/auth/register");

  // 步骤 2：填写用户名
  // getByLabel() 会查找 <label>用户名</label> 关联的 <input> 元素
  // fill() 方法清空输入框并填入新内容
  await page.getByLabel(/用户名|账号/i).fill(user.username);

  // 步骤 3：填写邮箱
  await page.getByLabel(/邮箱|电子邮件/i).fill(user.email);

  // 步骤 4：填写密码
  // ^密码$ 表示精确匹配"密码"两个字，避免匹配到"确认密码"
  await page.getByLabel(/^密码$/i).fill(user.password);

  // 步骤 5：填写确认密码
  await page.getByLabel(/确认密码/i).fill(user.password);

  // 步骤 6：点击注册按钮
  // 使用更精确的选择器：通过 type="submit" 属性定位表单提交按钮
  // 这样可以避免匹配到 Header 中的导航按钮
  await page
    .locator('button[type="submit"]')
    .filter({ hasText: "立即注册" })
    .click();

  // 步骤 7：等待重定向到登录页面
  // 注册成功后，应用会跳转到登录页面，提示用户登录
  // waitForURL() 会等待 URL 匹配指定的正则表达式
  // timeout: 5000 表示最多等待 5 秒，超时则测试失败
  await page.waitForURL(/\/auth\/login$/, { timeout: 5000 });
}

/**
 * 【辅助函数 4：用户登录流程】
 *
 * 函数作用：
 * - 自动完成整个登录流程：导航 → 填表 → 提交 → 验证
 *
 * 函数流程：
 * 1. 跳转到登录页面
 * 2. 填写用户名和密码
 * 3. 点击登录按钮
 * 4. 等待重定向到首页（登录成功的标志）
 *
 * 为什么只需要 username 和 password？
 * - 登录接口通常只需要用户名和密码
 * - 邮箱只在注册时使用
 *
 * 参数说明：
 * @param page - Playwright 的 Page 对象
 * @param user - 包含用户信息的对象
 * @returns Promise<void>
 */
async function loginUser(page: Page, user: TestUser): Promise<void> {
  // 步骤 1：导航到登录页面
  await page.goto("/auth/login");

  // 步骤 2：填写用户名
  // 登录页面的输入框可能显示"用户名"、"账号"或 placeholder "请输入账号"
  await page.getByLabel(/用户名|账号|请输入账号/i).fill(user.username);

  // 步骤 3：填写密码
  await page.getByLabel(/密码|请输入密码/i).fill(user.password);

  // 步骤 4：点击登录按钮
  // 使用更精确的选择器：通过 type="submit" 属性定位表单提交按钮
  await page
    .locator('button[type="submit"]')
    .filter({ hasText: "立即登录" })
    .click();

  // 步骤 5：等待重定向到首页
  // 登录成功后，应用会跳转到首页（/ 或 /home）
  // 正则 /\/(home)?$/ 匹配这两种情况：
  // - \/ 匹配路径中的斜杠
  // - (home)? 表示 home 是可选的（? 表示 0 或 1 次）
  // - $ 表示字符串结尾，确保精确匹配
  await page.waitForURL(/\/(home)?$/, { timeout: 5000 });

  // 等待 token 被保存到 localStorage（避免竞态条件）
  // 使用 waitForFunction 等待 token 实际存在
  await page.waitForFunction(
    () => {
      try {
        const token = localStorage.getItem("access_token");
        return token !== null && token !== "";
      } catch {
        return false;
      }
    },
    { timeout: 3000 },
  );
}

/**
 * ========================================================================
 * 🧪 测试套件：用户认证流程
 * ========================================================================
 *
 * test.describe() 的作用：
 * - 创建一个测试套件（Test Suite），把相关的测试组织在一起
 * - 类似于文件夹，方便管理和查看测试报告
 * - 可以共享 beforeEach、afterEach 等钩子函数
 *
 * 测试套件的好处：
 * 1. 结构清晰：一眼就能看出测试的分类
 * 2. 报告易读：测试失败时，能快速定位是哪个模块出问题
 * 3. 代码复用：套件内的测试可以共享变量和钩子函数
 */
test.describe("用户认证流程", () => {
  /**
   * 【变量声明】
   * 定义一个变量用于存储当前测试的用户信息
   * 在 beforeEach 中初始化，在各个测试用例中使用
   */
  let testUser: TestUser;

  /**
   * ====================================================================
   * 🔧 测试生命周期钩子：beforeEach
   * ====================================================================
   *
   * beforeEach 是什么？
   * - 一个特殊的钩子函数（Hook），在每个测试用例执行之前运行
   * - 类似于 React 的 useEffect，但是在测试框架中
   *
   * 为什么需要 beforeEach？
   * - 确保每个测试都从干净的状态开始（测试隔离性）
   * - 避免测试之间相互影响（测试独立性）
   * - 如果测试 A 登录了用户，测试 B 不应该受到影响
   *
   * 与 beforeAll 的区别：
   * - beforeAll: 只在所有测试开始前运行一次
   * - beforeEach: 在每个测试前都运行
   * - beforeEach 更安全，能保证测试之间完全隔离
   *
   * 本钩子做了什么？
   * 1. 创建一个新的唯一用户（使用时间戳）
   * 2. 清除浏览器存储（cookies 和 localStorage）
   */
  test.beforeEach(async ({ page }) => {
    // 1. 创建新的唯一测试用户
    // 每次测试都创建新用户，避免用户名冲突
    testUser = createTestUser();

    // 2. 清除浏览器存储
    // 确保没有之前测试留下的登录状态
    await clearBrowserStorage(page);
  });

  /**
   * ====================================================================
   * 🧹 测试生命周期钩子：afterEach
   * ====================================================================
   *
   * afterEach 是什么？
   * - 一个特殊的钩子函数，在每个测试用例执行之后运行
   * - 无论测试成功还是失败，都会执行
   *
   * 为什么需要 afterEach？
   * - 清理测试产生的数据（删除测试用户）
   * - 避免测试数据污染真实数据库
   * - 确保下次运行测试时环境干净
   *
   * 本钩子做了什么？
   * 1. 尝试登录为测试用户（获取 token）
   * 2. 调用后端 API 删除当前用户
   * 3. 如果失败，只打印警告不中断测试
   */
  test.afterEach(async ({ page }) => {
    // 清理数据库中所有测试用户（以 testuser_ 开头的用户）
    try {
      // 步骤 1：使用管理员账号登录获取 token
      // 从环境变量读取管理员凭据（安全最佳实践）
      // 在 .env 文件中配置：TEST_ADMIN_USERNAME 和 TEST_ADMIN_PASSWORD
      const adminUsername = process.env.TEST_ADMIN_USERNAME || "admin";
      const adminPassword = process.env.TEST_ADMIN_PASSWORD || "1234";

      const adminToken = await page.evaluate(
        async (credentials) => {
          try {
            const formData = new URLSearchParams();
            formData.append("username", credentials.username);
            formData.append("password", credentials.password);

            const response = await fetch("http://localhost:8000/users/login", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: formData.toString(),
            });

            if (response.ok) {
              const data = await response.json();
              return data.access_token;
            }
            return null;
          } catch {
            return null;
          }
        },
        { username: adminUsername, password: adminPassword },
      );

      if (adminToken) {
        // 步骤 2：获取所有用户列表
        const users = await page.evaluate(async (token) => {
          try {
            const response = await fetch(
              "http://localhost:8000/users/?limit=1000",
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (response.ok) {
              const data = await response.json();
              return data.users || [];
            }
            return [];
          } catch {
            return [];
          }
        }, adminToken);

        // 步骤 3：过滤并删除所有测试用户
        const testUsers = users.filter((user: { username: string }) =>
          user.username.startsWith("testuser_"),
        );

        if (testUsers.length > 0) {
          let deletedCount = 0;
          for (const user of testUsers) {
            const success = await page.evaluate(
              async (params) => {
                try {
                  const response = await fetch(
                    `http://localhost:8000/users/${params.userId}`,
                    {
                      method: "DELETE",
                      headers: {
                        Authorization: `Bearer ${params.token}`,
                      },
                    },
                  );
                  return response.ok;
                } catch {
                  return false;
                }
              },
              {
                userId: (user as { id: string }).id,
                token: adminToken,
              },
            );

            if (success) deletedCount++;
          }

          console.log(
            `✓ 已清理 ${deletedCount}/${testUsers.length} 个测试用户`,
          );
        }
      } else {
        console.warn("⚠️ 无法获取管理员权限，跳过批量清理（请配置管理员账号）");
      }
    } catch (error) {
      console.warn("清理测试用户时出错:", error);
    } finally {
      await clearBrowserStorage(page);
    }
  });

  /**
   * ====================================================================
   * ✅ 测试用例 1：注册流程
   * ====================================================================
   *
   * 测试目标：
   * - 验证用户能够成功注册新账号
   *
   * 测试步骤：
   * 1. 调用 registerUser() 完成注册流程
   * 2. 验证是否重定向到登录页
   *
   * 为什么这样就够了？
   * - registerUser() 函数内部已经包含了所有注册步骤和基本验证
   * - 这里只需要额外验证最终的 URL 是否正确
   *
   * expect() 是什么？
   * - Playwright 的断言（Assertion）方法
   * - 用于验证测试结果是否符合预期
   * - 如果断言失败，测试会标记为失败并报错
   *
   * toHaveURL() 是什么？
   * - 检查当前页面的 URL 是否匹配给定的正则表达式
   * - 如果不匹配，会抛出错误并显示实际 URL
   */
  test("注册流程 - 应该成功注册新用户", async ({ page }) => {
    // 执行注册流程
    await registerUser(page, testUser);

    // 验证：注册成功后应该跳转到登录页
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  /**
   * ====================================================================
   * ✅ 测试用例 2：登录流程
   * ====================================================================
   *
   * 测试目标：
   * - 验证用户能够使用正确的凭据登录
   *
   * 测试步骤：
   * 1. 先注册用户（因为需要有一个存在的账号）
   * 2. 再登录用户
   * 3. 验证是否重定向到首页
   * 4. 验证 localStorage 中是否存储了 access_token
   *
   * 为什么要先注册？
   * - 登录需要一个已存在的账号
   * - 在真实场景中，用户会先注册，再登录
   * - 测试应该模拟真实的用户行为
   *
   * page.evaluate() 的用法：
   * - 在浏览器上下文中执行代码
   * - 可以访问浏览器的 API（如 localStorage）
   * - 返回值会自动序列化并传回 Node.js 环境
   */
  test("登录流程 - 应该使用有效凭据成功登录", async ({ page }) => {
    // 步骤 1：先注册用户（注册后会跳转到登录页）
    await registerUser(page, testUser);

    // 步骤 2：现在在登录页，直接用刚注册的账号登录
    await loginUser(page, testUser);

    // 步骤 3：验证是否重定向到首页
    await expect(page).toHaveURL(/\/(home)?$/);

    // 步骤 4：验证 localStorage 中是否存储了 access_token
    // evaluate() 在浏览器中执行，获取 token
    const token = await page.evaluate(() => {
      try {
        return localStorage.getItem("access_token");
      } catch {
        return null;
      }
    });

    // 断言：token 不应该为空（登录成功会保存 token）
    expect(token).not.toBeNull();
    expect(token).not.toBe("");
  });

  /**
   * ====================================================================
   * ✅ 测试用例 3：登出流程
   * ====================================================================
   *
   * 测试目标：
   * - 验证用户能够成功登出
   *
   * 测试步骤：
   * 1. 先注册并登录
   * 2. 找到并点击登出按钮
   * 3. 验证是否重定向到登录页
   * 4. 验证 localStorage 中的 access_token 是否已清除
   *
   * 难点：如何找到登出按钮？
   * - 在本项目中，登出按钮在用户头像的下拉菜单中
   * - 需要先检查按钮是否可见
   * - 如果不可见，先打开下拉菜单
   *
   * isVisible() 是什么？
   * - Playwright 方法，检查元素是否在页面上可见
   * - 返回 boolean 值：true（可见）或 false（不可见）
   * - 不可见的原因：元素不存在、被隐藏（display: none）、在视口外
   */
  test("登出流程 - 应该成功登出用户", async ({ page }) => {
    // 步骤 1：先注册并登录
    await registerUser(page, testUser);
    await loginUser(page, testUser);

    // 步骤 2：等待页面加载完成并确保用户菜单已渲染
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000); // 额外等待确保 React 组件完全渲染

    // 步骤 3：点击用户菜单触发器（使用 data-testid）
    await page.getByTestId("user-menu-trigger").click();

    // 步骤 4：点击登出按钮（使用 data-testid）
    await page.getByTestId("logout-button").click();

    // 步骤 5：验证是否重定向（可能到首页或登录页）
    // 登出后应用会自动跳转，可能是首页 / 或登录页 /auth/login
    await page.waitForLoadState("domcontentloaded");

    // 验证 URL 是首页或登录页之一
    const currentUrl = page.url();
    expect(
      currentUrl.endsWith("/") || currentUrl.includes("/auth/login"),
    ).toBeTruthy();

    // 步骤 6：验证 localStorage 中的 token 是否已清除
    const token = await page.evaluate(() => {
      try {
        return localStorage.getItem("access_token");
      } catch {
        return null;
      }
    });

    // 断言：token 应该为空（登出成功会清除 token）
    expect(token).toBeNull();
  });

  /**
   * ====================================================================
   * ✅ 测试用例 4：受保护路由 - 未登录时重定向
   * ====================================================================
   *
   * 测试目标：
   * - 验证未登录用户访问受保护页面时会被重定向到登录页
   *
   * 什么是受保护路由？
   * - 需要登录才能访问的页面
   * - 通常用于用户仪表盘、个人设置、管理后台等
   * - 在代码中，这些路由用 <ProtectedRoute> 组件包裹
   *
   * 为什么这个测试很重要？
   * - 防止未授权用户访问敏感页面
   * - 是应用安全的基础防护
   * - 确保路由守卫（Route Guard）正常工作
   *
   * 测试步骤：
   * 1. 确保用户未登录（清除存储）
   * 2. 尝试直接访问受保护页面（/dashboard）
   * 3. 验证是否自动重定向到登录页
   *
   * 本项目中的受保护页面：
   * - /dashboard（仪表盘）
   * - /mdx/editor（MDX 编辑器）
   * - 未来可能还有：/profile、/settings 等
   */
  test("受保护路由 - 未登录时应该重定向到登录页", async ({ page }) => {
    // 步骤 1：确保用户未登录
    // clearBrowserStorage() 会清除所有登录凭证
    await clearBrowserStorage(page);

    // 步骤 2：尝试直接访问受保护页面
    await page.goto("/dashboard");

    // 步骤 3：验证是否被重定向到登录页
    // waitForURL() 会等待 URL 变化，如果超时则测试失败
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });
  });

  /**
   * ====================================================================
   * ✅ 测试用例 5：受保护路由 - 登录后可访问
   * ====================================================================
   *
   * 测试目标：
   * - 验证已登录用户可以正常访问受保护页面
   *
   * 测试步骤：
   * 1. 先注册并登录
   * 2. 访问受保护页面（/dashboard）
   * 3. 验证页面成功加载（URL 保持不变）
   * 4. 等待页面完全加载
   *
   * 为什么这个测试很重要？
   * - 确保登录功能正常工作
   * - 确保用户能够访问他们应该访问的页面
   * - 验证整个认证流程的完整性
   *
   * waitForLoadState() 是什么？
   * - Playwright 方法，等待页面达到特定的加载状态
   * - 'networkidle': 等待网络请求全部完成（至少 500ms 无新请求）
   * - 确保页面真的加载完成了，而不是卡在加载中
   */
  test("受保护路由 - 登录后应该可以访问", async ({ page }) => {
    // 步骤 1：先注册并登录
    await registerUser(page, testUser);
    await loginUser(page, testUser);

    // 步骤 2：访问受保护页面
    await page.goto("/dashboard");

    // 步骤 3：验证 URL 仍然是 /dashboard（没有被重定向）
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // 步骤 4：等待页面加载完成
    // 'networkidle' 表示等待所有网络请求完成
    // 这确保页面真的加载成功了
    await page.waitForLoadState("networkidle");

    // 额外验证：检查页面上是否有仪表盘的特征元素
    // 例如：标题、导航栏、内容区域等
    // 这里可以根据实际页面内容添加更多验证
  });
});

/**
 * ========================================================================
 * 🎓 学习总结
 * ========================================================================
 *
 * 通过这个测试文件，你学到了：
 *
 * 1. E2E 测试的核心概念
 *    - 什么是端到端测试？模拟真实用户在浏览器中的完整操作
 *    - 为什么需要 E2E 测试？验证整个系统的集成是否正常
 *    - E2E 测试 vs 单元测试 vs 集成测试的区别
 *
 * 2. Playwright 的核心 API
 *    - 页面导航：page.goto()
 *    - 元素查找：page.getByLabel()、page.getByRole()
 *    - 用户操作：fill()、click()
 *    - 等待机制：waitForURL()、waitForLoadState()
 *    - 浏览器交互：page.evaluate()
 *    - 断言验证：expect()、toHaveURL()、toBeNull()
 *
 * 3. 测试最佳实践
 *    - 使用辅助函数减少重复代码
 *    - 使用 beforeEach 确保测试隔离
 *    - 使用唯一标识符避免数据冲突（Date.now()）
 *    - 使用 try-catch 处理潜在错误
 *    - 添加适当的等待时间（timeout）
 *    - 编写清晰的测试描述（中文命名）
 *
 * 4. 认证流程的完整测试
 *    - 用户注册：填表 → 提交 → 验证重定向
 *    - 用户登录：填表 → 提交 → 验证 token
 *    - 用户登出：点击按钮 → 验证清除状态
 *    - 路由保护：未登录重定向 + 登录后放行
 *
 * 5. Playwright 测试结构
 *    - test.describe(): 创建测试套件（分组）
 *    - test.beforeEach(): 测试前的准备工作
 *    - test(): 定义具体的测试用例
 *    - expect(): 验证测试结果
 *
 * 6. 调试技巧
 *    - 使用 page.pause() 暂停测试，手动检查
 *    - 使用 page.screenshot() 截图保存状态
 *    - 使用 --debug 参数启动调试模式
 *    - 查看 Playwright Inspector 工具
 *
 * ========================================================================
 * 🚀 下一步：运行测试
 * ========================================================================
 *
 * 1. 启动完整的开发环境（需要三个终端）：
 *
 *    终端 1 - 启动后端和数据库：
 *    $ docker-compose -f docker-compose.dev.yml up
 *
 *    终端 2 - 启动前端开发服务器：
 *    $ cd frontend
 *    $ npm run dev
 *
 *    终端 3 - 运行 E2E 测试：
 *    $ npm run test:e2e              # 无头模式运行
 *    $ npm run test:e2e:ui           # 带 UI 界面运行（推荐）
 *    $ npm run test:e2e:debug        # 调试模式运行
 *
 * 2. 查看测试报告：
 *    $ npx playwright show-report
 *
 * 3. 只运行某个测试：
 *    $ npx playwright test -g "注册流程"
 *
 * 4. 查看测试覆盖率：
 *    $ npx playwright test --reporter=html
 *
 * ========================================================================
 * 📚 扩展阅读
 * ========================================================================
 *
 * - Playwright 官方文档：https://playwright.dev/
 * - Playwright 中文文档：https://playwright.bootcss.com/
 * - E2E 测试最佳实践：https://testingjavascript.com/
 * - Playwright 选择器指南：https://playwright.dev/docs/selectors
 *
 * ========================================================================
 */
