# E2E 测试环境配置

## 概述

本文档说明如何为端到端（E2E）测试配置环境变量，特别是管理员凭据的安全管理。

## 环境变量配置

### 测试管理员凭据

E2E 测试需要管理员权限来清理测试数据。为了安全起见，管理员凭据应该通过环境变量配置，而不是硬编码在测试文件中。

在项目根目录的 `.env` 文件中添加：

```bash
# ==========================================
# 测试配置
# ==========================================
# E2E 测试用管理员账号（用于清理测试数据）
TEST_ADMIN_USERNAME=admin
TEST_ADMIN_PASSWORD=1234
```

### Playwright 配置

Playwright 配置文件 (`frontend/playwright.config.ts`) 已经配置为自动加载根目录的 `.env` 文件：

```typescript
import dotenv from "dotenv";
import path from "path";
// 加载根目录的 .env 文件（包含测试管理员凭据）
dotenv.config({ path: path.resolve(__dirname, "../.env") });
```

## 安全最佳实践

### 为什么不硬编码凭据？

1. **安全风险**：硬编码的凭据可能被意外提交到版本控制系统
2. **灵活性差**：不同环境（开发、测试、CI）可能需要不同的凭据
3. **维护困难**：凭据变更时需要修改多个文件

### 推荐做法

1. **使用环境变量**：将敏感信息存储在环境变量中
2. **提供默认值**：为开发环境提供合理的默认值
3. **文档化**：在 `.env.example` 中提供示例配置
4. **分离关注点**：测试逻辑与配置分离

## 测试文件中的使用

在测试文件中，凭据通过环境变量读取：

```typescript
// 从环境变量读取管理员凭据（安全最佳实践）
// 在 .env 文件中配置：TEST_ADMIN_USERNAME 和 TEST_ADMIN_PASSWORD
const adminUsername = process.env.TEST_ADMIN_USERNAME || "admin";
const adminPassword = process.env.TEST_ADMIN_PASSWORD || "1234";

// 将凭据传递给浏览器上下文
const adminToken = await page.evaluate(
  async (credentials) => {
    // 在浏览器中使用传递的凭据
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);
    // ... 其余登录逻辑
  },
  { username: adminUsername, password: adminPassword },
);
```

## 注意事项

### 浏览器上下文限制

在 `page.evaluate()` 中执行的代码运行在浏览器上下文中，无法直接访问 Node.js 的 `process.env`。因此需要：

1. 在 Node.js 上下文中读取环境变量
2. 将值作为参数传递给 `page.evaluate()`

### CI/CD 环境

在持续集成环境中，确保设置相应的环境变量：

```bash
# GitHub Actions 示例
env:
  TEST_ADMIN_USERNAME: ${{ secrets.TEST_ADMIN_USERNAME }}
  TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
```

## 相关文件

- `.env` - 环境变量配置
- `frontend/playwright.config.ts` - Playwright 配置
- `frontend/tests/e2e/auth.spec.ts` - 主要 E2E 测试文件
- `frontend/tests/e2e/auth.spec.backup.ts` - 备份 E2E 测试文件
- `frontend/package.json` - 包含 dotenv 依赖
