# 前端集成测试方案概览

## 什么是集成测试？

集成测试位于测试金字塔的中间层，介于单元测试和端到端测试之间。它验证多个模块协同工作时的行为，特别是前端与后端 API 的交互。

## 测试金字塔

```mermaid
graph TB
    subgraph "测试金字塔"
        E2E["E2E 测试<br/>少量，慢速，高置信度"]
        Integration["集成测试<br/>适量，中速，验证交互"]
        Unit["单元测试<br/>大量，快速，验证逻辑"]
    end

    E2E --> Integration
    Integration --> Unit

    style E2E fill:#ff6b6b
    style Integration fill:#4ecdc4
    style Unit fill:#95e1d3
```

## 为什么需要真实的集成测试？

### 传统 Mock 方案的问题

```typescript
// ❌ 传统 Mock 方式
vi.mock("@/shared/api", () => ({
  useGetPosts: () => ({
    data: { items: [], total: 0 },
    isLoading: false,
  }),
}));
```

**问题**：

1. **假阳性**：测试通过，但真实 API 可能返回不同的数据结构
2. **维护成本高**：API 变更时需要同步更新所有 Mock
3. **无法测试边界情况**：网络错误、超时、认证失败等
4. **类型不匹配**：Mock 数据可能与实际类型定义不一致

### 真实集成测试的优势

```mermaid
flowchart LR
    subgraph "Mock 测试"
        FE1[前端代码] --> Mock[Mock 数据]
        Mock --> Test1[测试通过✓]
        style Mock fill:#ffeb3b
    end

    subgraph "真实集成测试"
        FE2[前端代码] --> HTTP[真实 HTTP]
        HTTP --> BE[后端 API]
        BE --> DB[(测试数据库)]
        DB --> BE
        BE --> HTTP
        HTTP --> FE2
        FE2 --> Test2[测试通过✓]
        style HTTP fill:#4caf50
        style BE fill:#4caf50
        style DB fill:#4caf50
    end
```

**优势**：

1. **真实性**：测试真实的 HTTP 请求、序列化、中间件
2. **契约验证**：自动验证前后端接口契约
3. **端到端信心**：覆盖整个数据流
4. **重构安全**：后端重构时测试能及时发现问题

## 我们的方案：Test Server + Isolated DB

### 核心理念

**不使用 Mock，而是运行一个真实的后端测试服务器**

```mermaid
graph TB
    subgraph "开发环境"
        DevFE[前端 :3000]
        DevBE[后端 :8000]
        DevDB[(开发数据库)]

        DevFE --> DevBE
        DevBE --> DevDB
    end

    subgraph "测试环境 (完全隔离)"
        TestRunner[Vitest 测试]
        TestBE[测试服务器 :8001]
        TestDB[(测试数据库<br/>test.db)]

        TestRunner -->|真实 HTTP| TestBE
        TestBE --> TestDB
    end

    style TestRunner fill:#e3f2fd
    style TestBE fill:#e8f5e9
    style TestDB fill:#fff3e0
```

### 关键特性

1. **完全隔离**：测试环境与开发环境零交叉
2. **真实 API**：使用真实的 FastAPI 应用
3. **可控状态**：通过测试后门 API 控制数据库状态
4. **快速重置**：每个测试前快速清空数据库

## 适用场景

### ✅ 适合集成测试

- React Query/SWR Hooks 的数据获取逻辑
- 认证流程（登录、Token 刷新、权限验证）
- 复杂的表单提交和验证
- 分页、筛选、排序等查询参数
- 文件上传和下载
- WebSocket 连接

### ❌ 不适合集成测试

- 纯 UI 组件（用单元测试）
- 工具函数（用单元测试）
- 用户交互流程（用 E2E 测试）
- 性能测试（用专门的性能测试工具）

## 测试流程概览

```mermaid
sequenceDiagram
    participant Dev as 开发者
    participant Vitest as Vitest 测试
    participant TestBE as 测试服务器
    participant TestDB as 测试数据库

    Dev->>TestBE: 1. 启动测试服务器
    Note over TestBE: 监听 :8001

    Dev->>Vitest: 2. 运行测试

    loop 每个测试
        Vitest->>TestBE: beforeEach: POST /test/db/reset
        TestBE->>TestDB: 清空所有表
        TestDB-->>TestBE: 完成
        TestBE-->>Vitest: 200 OK

        Vitest->>TestBE: 测试: GET /api/posts
        TestBE->>TestDB: 查询数据
        TestDB-->>TestBE: 返回结果
        TestBE-->>Vitest: JSON 响应

        Vitest->>Vitest: 断言验证
    end

    Vitest-->>Dev: 测试报告
```

## 与其他测试方案对比

| 特性     | Mock 测试   | 集成测试   | E2E 测试     |
| -------- | ----------- | ---------- | ------------ |
| 速度     | ⚡⚡⚡ 极快 | ⚡⚡ 较快  | ⚡ 慢        |
| 真实性   | ❌ 低       | ✅ 高      | ✅✅ 极高    |
| 维护成本 | 🔧🔧 中等   | 🔧 低      | 🔧🔧🔧 高    |
| 调试难度 | 😊 简单     | 😐 中等    | 😰 困难      |
| 覆盖范围 | 前端逻辑    | 前后端交互 | 完整用户流程 |
| 适用数量 | 大量        | 适量       | 少量         |

## 下一步

- [02-test-server-architecture.md](./02-test-server-architecture.md) - 测试服务器架构详解
- [03-frontend-test-setup.md](./03-frontend-test-setup.md) - 前端测试配置
- [04-writing-tests.md](./04-writing-tests.md) - 编写测试用例
- [05-best-practices.md](./05-best-practices.md) - 最佳实践
