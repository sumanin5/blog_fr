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
 * 🧪 测试套件：用户认证流程（优化版 - 单用户模式）
 * ========================================================================
 *
 * 【优化说明】
 * 原方案：每个测试创建新用户 → 执行测试 → 清理用户
 * 新方案：测试套件开始创建一个用户 → 所有测试共用 → 测试套件结束清理
 *
 * 【优势】
 * 1. 减少数据库操作：从 N 次注册/删除 → 1 次注册/删除
 * 2. 加快测试速度：减少网络请求和等待时间
 * 3. 更符合真实场景：真实用户不会每次都注册新账号
 *
 * 【注意事项】
 * - 测试之间需要注意状态管理（登录/登出）
 * - beforeEach 需要确保每个测试开始前状态一致
 * - 如果某个测试失败，不会影响其他测试
 */
test.describe("用户认证流程", () => {
  /**
   * 【变量声明】
   * 定义一个变量用于存储整个测试套件共用的用户信息
   * 在 beforeAll 中初始化并注册，在 afterAll 中清理
   */
  let testUser: TestUser;

  /**
   * ====================================================================
   * 🔧 测试生命周期钩子：beforeAll（只运行一次）
   * ====================================================================
   *
   * beforeAll 是什么？
   * - 在所有测试开始前只运行一次的钩子函数
   * - 用于执行耗时的设置操作（如创建测试用户）
   *
   * 与 beforeEach 的区别：
   * - beforeAll: 整个测试套件开始前运行一次
   * - beforeEach: 每个测试用例前都运行
   *
   * 本钩子做了什么？
   * 1. 创建一个唯一的测试用户
   * 2. 注册这个用户到数据库
   * 3. 等待注册完成
   */
  test.beforeAll(async ({ browser }) => {
    // 创建一个新的浏览器上下文用于注册
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // 1. 创建唯一测试用户
      testUser = createTestUser();
      console.log(`\n📝 创建测试用户: ${testUser.username}`);

      // 2. 注册用户
      await registerUser(page, testUser);
      console.log(`✅ 测试用户注册成功\n`);
    } catch (error) {
      console.error("❌ 测试用户注册失败:", error);
      throw error; // 如果注册失败，中断所有测试
    } finally {
      // 关闭临时的页面和上下文
      await page.close();
      await context.close();
    }
  });

  /**
   * ====================================================================
   * 🔧 测试生命周期钩子：beforeEach
   * ====================================================================
   *
   * beforeEach 的作用：
   * - 确保每个测试开始前状态一致
   * - 清除上一个测试留下的登录状态
   *
   * 为什么还需要 beforeEach？
   * - 虽然共用一个用户，但每个测试的登录状态可能不同
   * - 例如：测试登出后，需要清除登录状态
   * - 清除浏览器存储确保测试独立性
   */
  test.beforeEach(async ({ page }) => {
    // 清除浏览器存储（localStorage、sessionStorage）
    // 确保每个测试从"未登录"状态开始
    await clearBrowserStorage(page);
  });

  /**
   * ====================================================================
   * 🧹 测试生命周期钩子：afterAll（只运行一次）
   * ====================================================================
   *
   * afterAll 是什么？
   * - 在所有测试结束后只运行一次的钩子函数
   * - 用于清理测试数据（如删除测试用户）
   *
   * 本钩子做了什么？
   * 1. 使用管理员账号登录获取 token
   * 2. 调用后端 API 删除所有测试用户
   * 3. 如果失败，打印警告但不中断
   */
  test.afterAll(async ({ request }) => {
    console.log(`\n🧹 开始清理测试用户...`);

    try {
      // 步骤 1：使用管理员账号登录获取 token
      // 从环境变量读取管理员凭据（安全最佳实践）
      // 在 .env 文件中配置：TEST_ADMIN_USERNAME 和 TEST_ADMIN_PASSWORD
      const adminUsername = process.env.TEST_ADMIN_USERNAME || "admin";
      const adminPassword = process.env.TEST_ADMIN_PASSWORD || "1234";

      console.log("[清理] 尝试管理员登录...");
      const loginResponse = await request.post(
        "http://localhost:8000/users/login",
        {
          form: {
            username: adminUsername,
            password: adminPassword,
          },
        },
      );

      if (!loginResponse.ok()) {
        const errorText = await loginResponse.text();
        console.error("❌ 无法获取管理员 token，清理失败");
        console.error(`登录响应状态: ${loginResponse.status()}`);
        console.error(`错误信息: ${errorText}`);
        console.error("请确保：");
        console.error("  1. 后端服务正在运行（http://localhost:8000）");
        console.error("  2. 管理员账号存在（用户名: admin，密码: 1234）");
        console.error(
          "  3. 数据库已初始化（运行 docker-compose up 会自动初始化）\n",
        );
        return;
      }

      const loginData = await loginResponse.json();
      const adminToken = loginData.access_token;
      console.log("[清理] 管理员登录成功");

      // 步骤 2：获取所有用户列表
      console.log("[清理] 获取所有用户列表...");
      const usersResponse = await request.get(
        "http://localhost:8000/users/?limit=1000",
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      if (!usersResponse.ok()) {
        console.error("[清理] 获取用户列表失败");
        return;
      }

      const usersData = await usersResponse.json();
      const users = usersData.users || [];

      // 步骤 3：过滤并删除所有测试用户
      const testUsers = users.filter((user: { username: string }) =>
        user.username.startsWith("testuser_"),
      );

      if (testUsers.length > 0) {
        console.log(`🗑️  发现 ${testUsers.length} 个测试用户，开始删除...`);
        let deletedCount = 0;
        let failedCount = 0;

        for (const user of testUsers) {
          try {
            const deleteResponse = await request.delete(
              `http://localhost:8000/users/${(user as { id: string }).id}`,
              {
                headers: {
                  Authorization: `Bearer ${adminToken}`,
                },
              },
            );

            if (deleteResponse.ok()) {
              deletedCount++;
              console.log(
                `  ✓ 已删除: ${(user as { username: string }).username}`,
              );
            } else {
              failedCount++;
              console.warn(
                `  ✗ 删除失败: ${(user as { username: string }).username}`,
              );
            }
          } catch (error) {
            failedCount++;
            console.warn(
              `  ✗ 删除用户时出错: ${(user as { username: string }).username}`,
              error,
            );
          }
        }

        if (failedCount === 0) {
          console.log(`✅ 成功清理所有 ${deletedCount} 个测试用户\n`);
        } else {
          console.warn(
            `⚠️  清理完成：成功 ${deletedCount} 个，失败 ${failedCount} 个\n`,
          );
        }
      } else {
        console.log(`ℹ️  没有需要清理的测试用户\n`);
      }
    } catch (error) {
      console.warn("⚠️  清理测试用户时出错:", error);
    }
  });

  /**
   * ====================================================================
   * ✅ 测试用例 1：注册流程（已在 beforeAll 中完成）
   * ====================================================================
   *
   * 测试目标：
   * - 验证用户能够成功注册（此测试已被 beforeAll 覆盖）
   *
   * 说明：
   * - 在新的测试结构中，注册在 beforeAll 中完成
   * - 这个测试用例被改为验证已注册用户可以登录
   * - 如果 beforeAll 中的注册失败，整个测试套件会中断
   *
   * 注意：这个测试被注释掉，因为注册已经在 beforeAll 中完成
   */
  // test("注册流程 - 应该成功注册新用户", async ({ page }) => {
  //   // 已在 beforeAll 中完成注册
  //   // 这里可以验证用户确实存在于数据库中
  // });

  /**
   * ====================================================================
   * ✅ 测试用例 1：登录流程
   * ====================================================================
   *
   * 测试目标：
   * - 验证用户能够使用已注册的凭据成功登录
   *
   * 测试步骤：
   * 1. 使用 beforeAll 中注册的用户凭据
   * 2. 执行登录流程
   * 3. 验证是否重定向到首页
   * 4. 验证 localStorage 中是否存储了 access_token
   *
   * 优化点：
   * - 不需要每次都注册新用户
   * - 使用已存在的测试用户
   * - 减少了一次网络请求和等待时间
   */
  test("登录流程 - 应该使用有效凭据成功登录", async ({ page }) => {
    // 步骤 1：执行登录流程（使用 beforeAll 中注册的用户）
    await loginUser(page, testUser);

    // 步骤 2：验证是否重定向到首页
    await expect(page).toHaveURL(/\/(home)?$/);

    // 步骤 3：验证 localStorage 中是否存储了 access_token
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
   * ✅ 测试用例 2：登出流程
   * ====================================================================
   *
   * 测试目标：
   * - 验证用户能够成功登出
   *
   * 测试步骤：
   * 1. 先登录（使用已注册的用户）
   * 2. 找到并点击登出按钮
   * 3. 验证是否成功登出（URL变化或token清除）
   * 4. 验证 localStorage 中的 access_token 是否已清除
   *
   * 优化点：
   * - 不需要注册新用户
   * - 直接使用已存在的测试用户
   * - 测试后 beforeEach 会清除登录状态
   */
  test("登出流程 - 应该成功登出用户", async ({ page }) => {
    // 步骤 1：先登录
    await loginUser(page, testUser);

    // 步骤 2：等待页面加载完成并确保用户菜单已渲染
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // 步骤 3：点击用户菜单触发器
    await page.getByTestId("user-menu-trigger").click();

    // 步骤 4：点击登出按钮
    await page.getByTestId("logout-button").click();

    // 步骤 5：验证是否重定向
    await page.waitForLoadState("domcontentloaded");
    const currentUrl = page.url();
    expect(
      currentUrl.endsWith("/") || currentUrl.includes("/auth/login"),
    ).toBeTruthy();

    // 步骤 6：验证 token 是否已清除
    const token = await page.evaluate(() => {
      try {
        return localStorage.getItem("access_token");
      } catch {
        return null;
      }
    });

    expect(token).toBeNull();
  });

  /**
   * ====================================================================
   * ✅ 测试用例 3：受保护路由 - 未登录时重定向
   * ====================================================================
   *
   * 测试目标：
   * - 验证未登录用户访问受保护页面时会被重定向到登录页
   *
   * 测试步骤：
   * 1. 确保用户未登录（beforeEach 已清除存储）
   * 2. 尝试直接访问受保护页面
   * 3. 验证是否自动重定向到登录页
   *
   * 优化点：
   * - beforeEach 自动清除登录状态
   * - 不需要手动调用 clearBrowserStorage
   */
  test("受保护路由 - 未登录时应该重定向到登录页", async ({ page }) => {
    // beforeEach 已经清除了浏览器存储，确保未登录状态

    // 尝试直接访问受保护页面
    await page.goto("/dashboard");

    // 验证是否被重定向到登录页
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });
  });

  /**
   * ====================================================================
   * ✅ 测试用例 4：受保护路由 - 登录后可访问
   * ====================================================================
   *
   * 测试目标：
   * - 验证已登录用户可以正常访问受保护页面
   *
   * 测试步骤：
   * 1. 登录用户
   * 2. 访问受保护页面
   * 3. 验证页面成功加载
   * 4. 等待页面完全加载
   *
   * 优化点：
   * - 不需要注册新用户
   * - 直接使用已存在的测试用户
   */
  test("受保护路由 - 登录后应该可以访问", async ({ page }) => {
    // 步骤 1：登录用户
    await loginUser(page, testUser);

    // 步骤 2：访问受保护页面
    await page.goto("/dashboard");

    // 步骤 3：验证 URL 仍然是 /dashboard（没有被重定向）
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // 步骤 4：等待页面加载完成
    await page.waitForLoadState("networkidle");
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
 *    - 使用 beforeAll/afterAll 优化测试性能
 *    - 使用 beforeEach 确保测试隔离
 *    - 使用唯一标识符避免数据冲突（Date.now()）
 *    - 使用 try-catch 处理潜在错误
 *    - 添加适当的等待时间（timeout）
 *    - 编写清晰的测试描述（中文命名）
 *
 * 4. 认证流程的完整测试
 *    - 用户注册：一次注册，多个测试共用
 *    - 用户登录：填表 → 提交 → 验证 token
 *    - 用户登出：点击按钮 → 验证清除状态
 *    - 路由保护：未登录重定向 + 登录后放行
 *
 * 5. Playwright 测试结构优化
 *    - test.beforeAll(): 一次性设置（注册用户）
 *    - test.beforeEach(): 确保测试隔离（清除登录状态）
 *    - test(): 定义具体的测试用例
 *    - test.afterAll(): 一次性清理（删除测试用户）
 *    - expect(): 验证测试结果
 *
 * 6. 性能优化
 *    - 减少重复的注册操作（从 N 次 → 1 次）
 *    - 减少数据库操作和网络请求
 *    - 加快测试执行速度
 *    - 保持测试隔离性和可靠性
 *
 * 7. 两种测试模式对比
 *
 *    【旧模式：每个测试独立用户】
 *    ✅ 优点：
 *       - 测试完全独立，互不影响
 *       - 每个测试都是完整的场景
 *    ❌ 缺点：
 *       - 重复注册/删除用户，浪费时间
 *       - 大量网络请求，测试较慢
 *       - 数据库压力较大
 *
 *    【新模式：共享一个用户】
 *    ✅ 优点：
 *       - 只需注册一次，测试更快
 *       - 减少网络请求和数据库操作
 *       - 更符合真实用户行为
 *       - 节省资源
 *    ⚠️ 注意：
 *       - 需要确保测试之间状态清理
 *       - beforeEach 清除登录状态很重要
 *       - 如果某个测试修改了用户数据，可能影响其他测试
 *
 * 8. 何时使用哪种模式？
 *
 *    使用【独立用户模式】的场景：
 *    - 测试会修改用户数据（如修改密码、更新个人信息）
 *    - 测试涉及用户权限变化
 *    - 需要测试多用户交互
 *
 *    使用【共享用户模式】的场景：
 *    - 只读操作（如查看页面、导航）
 *    - 认证流程测试（登录/登出）
 *    - 路由保护测试
 *    - 需要快速执行的冒烟测试（Smoke Tests）
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
 *    $ npx playwright test -g "登录流程"
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
 * - 测试生命周期钩子：https://playwright.dev/docs/api/class-test#test-before-all
 *
 * ========================================================================
 */
