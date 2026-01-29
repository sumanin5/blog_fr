# 前端集成测试环境搭建计划 (Frontend Integration Testing Plan)

## 1. 核心目标

建立一个**隔离的端到端集成测试环境**，使前端 Vitest 测试能够连接真实的后端 API 和数据库，验证 Hooks 及数据逻辑的准确性，同时**零污染**开发环境数据。

## 2. 架构设计 (Architecture)

我们不使用 Mock，而是采用 **"Test Server + Isolated DB"** 模式：

- **Test Server (后端)**: 运行在 `:8001` 端口的独立 FastAPI 实例。
  - **数据库**: 连接至独立的 `test.db` (SQLite) 或临时 PostgreSQL 库。
  - **依赖注入**: 强制覆盖 `get_session` 依赖，确保所有 API 操作均在测试库中进行。
  - **测试后门 (Test Backdoor)**: 挂载专用于测试的 API 路由 (e.g., `/api/test/reset`), 供前端测试脚本调用以重置状态。

- **Vitest (前端)**:
  - 配置为 **Integration Mode**。
  - 移除对 `api-client` 的 Mock，让其发起真实的 HTTP 请求至 `:8001`。
  - 在 `beforeAll` / `afterEach` 钩子中调用后端的重置接口。

## 3. 执行路线图

### Phase 1: 后端测试服务搭建 (Backend Setup)

- [ ] **创建测试路由 (`backend/app/api/test_router.py`)**:
  - 实现 `POST /test/db/reset`: 清空所有表并重新创建 Schema。
  - 实现 `POST /test/db/seed`: (可选) 注入基础的用户/配置数据。
- [ ] **创建启动脚本 (`backend/scripts/run_test_server.py`)**:
  - 基于现有的 `app` 实例。
  - 覆盖数据库 Engine 配置 (使用 `sqlite:///./test.db`)。
  - 挂载 `test_router`。
  - 启动 Uvicorn 服务于 8001 端口。

### Phase 2: 前端测试配置 (Frontend Config)

- [ ] **改造 Vitest 配置 (`frontend/vitest.config.ts`)**:
  - 取消对 `shared/api` 的 Mock。
  - 设置环境变量 `VITE_API_BASE_URL=http://localhost:8001`。
- [ ] **编写测试工具函数 (`frontend/src/lib/test-utils.ts`)**:
  - 封装 `resetDB()` 方法，方便在测试文件中调用。
  - 封装 `createTestUser()` 等辅助方法。

### Phase 3: 编写真·集成测试 (Real Hooks Testing)

- [ ] **测试 `useAuth`**:
  - 真实注册一个用户 -> 登录 -> 获取 Token -> 验证会话。
- [ ] **测试 `useAnalytics` / `useAnalyticsStats`**:
  - 真实触发 `trackEvent`。
  - 调用 `getAnalyticsStats` 确认数据已写入数据库。
- [ ] **测试数据获取 Hook**:
  - 验证复杂的 Query 参数是否被后端正确解析。

## 4. 预期工作流 (Workflow)

1. **终端 A**: 运行 `python backend/scripts/run_test_server.py` (启动隔离环境)。
2. **终端 B**: 运行 `pnpm test` (执行前端测试)。
