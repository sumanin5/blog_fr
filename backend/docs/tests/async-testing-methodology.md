# Python 异步测试方法论

本文档介绍 Python 异步测试的核心概念、最佳实践和常见问题处理方法。

## 目录

1. [核心概念](#核心概念)
2. [TestClient vs AsyncClient](#testclient-vs-asyncclient)
3. [测试架构设计](#测试架构设计)
4. [pytest-asyncio 配置](#pytest-asyncio-配置)
5. [Fixtures 设计模式](#fixtures-设计模式)
6. [数据隔离策略](#数据隔离策略)
7. [测试环境隔离](#测试环境隔离)
8. [常见问题排查](#常见问题排查)
9. [检查清单](#检查清单)

---

## 核心概念

### 事件循环 (Event Loop)

事件循环是异步编程的调度中心：

```
┌─────────────────────────────────────────┐
│              事件循环                    │
│                                         │
│   异步任务队列：                         │
│   [数据库查询] [HTTP请求] [文件IO] ...   │
│         ↓          ↓         ↓          │
│      依次执行，遇到等待就切换到下一个      │
└─────────────────────────────────────────┘
```

**核心原则**：
- 一个事件循环同时只运行一个任务
- 异步资源（连接、socket）绑定到创建它的循环
- 不同循环之间的资源不能混用

### Fixture 作用域 (Scope)

pytest fixtures 有四种作用域：

| Scope | 生命周期 | 适用场景 |
|-------|---------|---------|
| `function` | 每个测试函数 | 需要隔离的数据、会话 |
| `class` | 每个测试类 | 类级别共享资源 |
| `module` | 每个模块 | 模块级别共享资源 |
| `session` | 整个测试会话 | 数据库连接池、昂贵资源 |

---

## TestClient vs AsyncClient

### 概览：两种测试客户端

在 FastAPI/Starlette 测试中，有两种常用的测试客户端：

| 特性 | TestClient | AsyncClient |
|------|------------|-------------|
| **来源** | `starlette.testclient` / `fastapi.testclient` | `httpx` |
| **调用方式** | 同步 (`def test_xxx`) | 异步 (`async def test_xxx`) |
| **底层实现** | 内部使用 `httpx.Client` | 直接使用 `httpx.AsyncClient` |
| **适用场景** | 简单同步测试 | 异步应用、复杂异步测试 |

### TestClient 详解

```python
from fastapi.testclient import TestClient
# 或
from starlette.testclient import TestClient

from app.main import app

# 同步测试
def test_read_main():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
```

**工作原理**：

```
┌─────────────────────────────────────────────────────────────┐
│                    TestClient 工作流                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   def test_xxx():                                           │
│       client = TestClient(app)                              │
│       response = client.get("/users")                       │
│                    │                                        │
│                    ▼                                        │
│       ┌──────────────────────────┐                          │
│       │   httpx.Client (同步)    │ ◄── TestClient 内部封装  │
│       └──────────────────────────┘                          │
│                    │                                        │
│                    ▼                                        │
│       ┌──────────────────────────┐                          │
│       │ ASGITransport (进程内)   │ ◄── 不走真实网络         │
│       └──────────────────────────┘                          │
│                    │                                        │
│                    ▼                                        │
│       ┌──────────────────────────┐                          │
│       │   ASGI App (FastAPI)     │                          │
│       │   - 处理请求             │                          │
│       │   - 创建事件循环执行异步 │ ◄── TestClient 自己创建  │
│       │   - 返回响应             │                          │
│       └──────────────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**特点**：
- ✅ 使用简单，不需要 `async/await`
- ✅ 不需要配置 pytest-asyncio
- ❌ 会创建自己的事件循环
- ❌ 与异步 fixtures 可能冲突

### AsyncClient 详解

```python
from httpx import AsyncClient, ASGITransport
import pytest

from app.main import app

@pytest.mark.asyncio
async def test_read_main():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get("/")
        assert response.status_code == 200
```

**工作原理**：

```
┌─────────────────────────────────────────────────────────────┐
│                   AsyncClient 工作流                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   async def test_xxx():            ◄── pytest-asyncio       │
│       async with AsyncClient(                               │
│           transport=ASGITransport(app)                      │
│       ) as client:                                          │
│           response = await client.get("/users")             │
│                          │                                  │
│                          ▼                                  │
│           ┌──────────────────────────┐                      │
│           │ httpx.AsyncClient (异步) │                      │
│           └──────────────────────────┘                      │
│                          │                                  │
│                          ▼                                  │
│           ┌──────────────────────────┐                      │
│           │ ASGITransport (进程内)   │ ◄── 不走真实网络     │
│           └──────────────────────────┘                      │
│                          │                                  │
│                          ▼                                  │
│           ┌──────────────────────────┐                      │
│           │   ASGI App (FastAPI)     │                      │
│           │   - 共享同一事件循环     │ ◄── pytest-asyncio   │
│           │   - 处理请求并返回       │      提供的循环      │
│           └──────────────────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**特点**：
- ✅ 与测试共享同一事件循环
- ✅ 可以与异步 fixtures 完美配合
- ✅ 更接近异步应用的真实运行方式
- ⚠️ 需要配置 pytest-asyncio

### 关键区别：事件循环管理

```
TestClient 的事件循环:
┌─────────────────────────────────────────────────────────────┐
│   同步测试函数 (def test_xxx)                               │
│       │                                                     │
│       ▼                                                     │
│   TestClient.get("/users")                                  │
│       │                                                     │
│       ▼                                                     │
│   ┌─────────────────────────────────┐                       │
│   │ TestClient 创建临时事件循环     │ ◄── 每次请求新循环!  │
│   │ 运行 async app，然后销毁循环    │                       │
│   └─────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘

AsyncClient 的事件循环:
┌─────────────────────────────────────────────────────────────┐
│   pytest-asyncio 创建的事件循环 (session 级别)              │
│       │                                                     │
│       ├────────────────────────┐                            │
│       ▼                        ▼                            │
│   async def test_xxx       async fixtures                   │
│       │                        │                            │
│       ▼                        ▼                            │
│   AsyncClient  ◄────── 共享同一循环 ──────► db_session     │
│       │                                                     │
│       ▼                                                     │
│   ASGI App (也在同一循环中运行)                             │
└─────────────────────────────────────────────────────────────┘
```

### 为什么我们选择 AsyncClient？

当你的应用使用异步数据库（如 SQLAlchemy async、asyncpg）时：

```python
# ❌ 使用 TestClient 可能遇到的问题
def test_create_user(db_session):  # db_session 是异步 fixture？
    # 问题：db_session 在一个循环，TestClient 创建另一个循环
    client = TestClient(app)
    response = client.post("/users", json={...})
    # RuntimeError: attached to a different loop!

# ✅ 使用 AsyncClient
async def test_create_user(db_session, async_client):
    # 全部在同一个事件循环中
    response = await async_client.post("/users", json={...})
    # 完美工作！
```

### 总结：如何选择

| 场景 | 推荐工具 |
|------|---------|
| 简单 API 测试，无数据库 | TestClient |
| 异步数据库（asyncpg, aiomysql）| AsyncClient |
| 需要异步 fixtures | AsyncClient |
| 测试 WebSocket | 两者都可，AsyncClient 更灵活 |
| 团队都熟悉同步代码 | TestClient |
| 想要测试更接近生产环境 | AsyncClient |

### 推荐架构

```
┌─────────────────────────────────────────────────────────┐
│                    测试会话 (Session)                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           事件循环 (唯一)                         │   │
│  │                                                 │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  db_engine (session scope)              │   │   │
│  │  │  - 创建表（一次）                         │   │   │
│  │  │  - 管理连接池                            │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                     │                           │   │
│  │    ┌────────────────┼────────────────┐         │   │
│  │    ▼                ▼                ▼         │   │
│  │  ┌──────┐       ┌──────┐       ┌──────┐       │   │
│  │  │test_1│       │test_2│       │test_3│       │   │
│  │  │      │       │      │       │      │       │   │
│  │  │session│      │session│      │session│      │   │
│  │  │(func) │      │(func) │      │(func) │      │   │
│  │  │      │       │      │       │      │       │   │
│  │  │回滚   │       │回滚   │       │回滚   │       │   │
│  │  └──────┘       └──────┘       └──────┘       │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 设计原则

1. **一个事件循环**：整个测试会话共用一个事件循环
2. **连接池复用**：数据库引擎 session 级别，避免重复创建
3. **会话隔离**：每个测试函数独立的数据库会话
4. **事务回滚**：用回滚而不是删除数据来保证隔离

---

## pytest-asyncio 配置

### 推荐配置 (pyproject.toml)

将 pytest 配置放在 `pyproject.toml` 中，保持项目配置统一：

```toml
[tool.pytest.ini_options]
addopts = "-p no:warnings"
asyncio_mode = "auto"
# 关键配置：所有异步测试和 fixtures 共用同一个事件循环
asyncio_default_fixture_loop_scope = "session"
asyncio_default_test_loop_scope = "session"
markers = [
    "unit: mark test as a unit test",
    "integration: mark test as an integration test",
]
```

### 配置说明

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `asyncio_mode` | `auto` | 自动检测异步测试，无需手动标记 |
| `asyncio_default_fixture_loop_scope` | `session` | 所有 fixtures 共用 session 级别循环 |
| `asyncio_default_test_loop_scope` | `session` | 所有测试函数也共用 session 级别循环 |

**重要**：这两个 scope 配置必须一致！

### ⚠️ 避免的配置

```ini
# 不推荐：会导致循环冲突
asyncio_default_fixture_loop_scope = session
asyncio_default_test_loop_scope = function  # 冲突！
```

---

## Fixtures 设计模式

### 数据库引擎 (Session Scope)

```python
@pytest.fixture(scope="session")
async def db_engine():
    """
    整个测试会话只创建一次
    - 创建表结构
    - 管理连接池
    """
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield async_engine

    # 清理
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await async_engine.dispose()
```

### 数据库会话 (Function Scope)

```python
@pytest.fixture(scope="function")
async def session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    每个测试独立会话，用回滚保证隔离
    """
    async_session_maker = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        yield session
        await session.rollback()  # 关键！
```

### 测试客户端

```python
@pytest.fixture(scope="function")
async def async_client(session: AsyncSession):
    """
    覆盖依赖注入，使用测试会话
    """
    async def override_get_session():
        yield session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
```

---

## 数据隔离策略

### 策略对比

| 策略 | 优点 | 缺点 | 推荐场景 |
|------|------|------|---------|
| 事务回滚 | 快速、简单 | 无法测试提交行为 | 大多数场景 |
| 嵌套事务 (Savepoint) | 真实提交、完全隔离 | 稍复杂 | 需要测试提交的场景 |
| 每次重建表 | 完全隔离 | 非常慢 | 需要测试 DDL |
| 手动清理数据 | 灵活 | 容易遗漏 | 特殊场景 |

### 推荐：嵌套事务 (Savepoint)

### 1. 什么是“嵌套事务” (Nested Transaction)？

在数据库层面，真正的“嵌套事务”（即 BEGIN 里面再 BEGIN）很多数据库（如 MySQL）其实是不原生支持的。

但是，现代 ORM（如 SQLAlchemy）通过 **Savepoint（保存点）** 机制模拟了嵌套事务：

- **外层事务**：对应真正的数据库事务（BEGIN）。
- **内层事务**：对应数据库的 SAVEPOINT sp_1。
- **回滚**：如果是内层回滚，只是 ROLLBACK TO sp_1；如果是外层回滚，则是 ROLLBACK。

**通俗理解**：
就好比写文档。

- **外层事务**是你打开了文档（开始编辑）。
- **嵌套事务**是你每写一段就按一下 Ctrl+S（只是暂存，还没发给老板）。
- **测试回滚**是指：不管你中间按了多少次 Ctrl+S（代码里的 commit），测试结束时，我直接**不保存关闭文档**（或者点“撤销到打开时的状态”），文档依然是一片空白。

------



### 2. 这算是 Web 项目的最佳实践吗？

**对于“集成测试 / 单元测试”来说，这绝对是最佳实践（Gold Standard）。**

如果不使用这种方式，你在测试数据库时通常只有两个选择：

1. **每次测试后清空表 (TRUNCATE/DELETE)**：速度慢，且容易如果有外键约束会很麻烦。
2. **每次测试重新建库 (DROP/CREATE)**：速度极慢，不可接受。

**嵌套事务方案的优势：**

- **极速**：不需要删表建表，甚至不需要真正写入磁盘（取决于 DB 配置），纯内存操作或日志操作。
- **隔离性**：每个测试用例拿到的都是“干净”的数据库状态。
- **兼容性**：完美兼容应用代码中的 session.commit()。即使你的业务逻辑里写了 commit，在测试环境下它也不会真的把数据持久化。

嵌套事务使用数据库的 SAVEPOINT 功能，允许在外层事务中创建保存点，测试结束时回滚到保存点：

```python
@pytest.fixture(scope="function")
async def session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    使用嵌套事务保证测试隔离

    原理：
    1. 开启外层连接事务 (BEGIN)
    2. 创建 SAVEPOINT
    3. 应用代码在 savepoint 中运行（包括 commit 也只提交到 savepoint）
    4. 测试结束时 ROLLBACK 到外层事务
    """
    async with db_engine.connect() as connection:
        # 开始外层事务
        transaction = await connection.begin()

        # 创建嵌套事务（SAVEPOINT）
        nested = await connection.begin_nested()

        # 创建 session，绑定到这个连接
        async_session_maker = async_sessionmaker(
            bind=connection,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )

        async with async_session_maker() as session:
            # 当 session.commit() 被调用时，自动创建新的 savepoint
            @event.listens_for(session.sync_session, "after_transaction_end")
            def reopen_nested_transaction(session, transaction):
                if connection.closed:
                    return
                if not connection.in_nested_transaction():
                    if connection.sync_connection:
                        connection.sync_connection.begin_nested()

            yield session

        # 回滚外层事务，撤销所有更改
        await transaction.rollback()
```

### 嵌套事务工作原理

```
┌─────────────────────────────────────────────────────────────┐
│                     数据库连接                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BEGIN (外层事务)                                           │
│      │                                                      │
│      ▼                                                      │
│  SAVEPOINT sp1 (嵌套事务)                                   │
│      │                                                      │
│      ├─── INSERT INTO users ... ──────► 数据在 savepoint   │
│      │                                                      │
│      ├─── session.commit() ───────────► RELEASE sp1        │
│      │                                   SAVEPOINT sp2     │
│      │                                                      │
│      ├─── UPDATE users ... ───────────► 数据在 sp2        │
│      │                                                      │
│      ▼                                                      │
│  测试结束                                                   │
│      │                                                      │
│      ▼                                                      │
│  ROLLBACK (外层事务) ─────────────────► 所有数据撤销！      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 简单回滚 vs 嵌套事务

```python
# 简单回滚：应用代码的 commit 不会真正执行
async with async_session_maker() as session:
    yield session
    await session.rollback()  # 问题：如果应用已经 commit 了，这里回滚无效

# 嵌套事务：即使应用 commit，也只是提交到 savepoint
async with connection.begin() as transaction:
    nested = await connection.begin_nested()
    session = AsyncSession(bind=connection)
    yield session
    await transaction.rollback()  # 回滚外层事务，savepoint 中的提交也被撤销
```

---

## 测试环境隔离

### 本地测试 vs Docker 环境

测试隔离分两个层面：

```
┌─────────────────────────────────────────────────────────────┐
│                     环境隔离层面                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  层面 1: 物理隔离（不同的数据库实例）                        │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │   本地开发/测试      │    │   Docker 容器       │        │
│  │                     │    │                     │        │
│  │   PostgreSQL        │    │   PostgreSQL        │        │
│  │   localhost:5432    │    │   db:5432           │        │
│  │   (test_blog_db)    │    │   (blog_db)         │        │
│  │                     │    │                     │        │
│  │   ◄── 测试数据       │    │   ◄── 生产数据      │        │
│  └─────────────────────┘    └─────────────────────┘        │
│                                                             │
│  层面 2: 测试内隔离（同一数据库，不同事务）                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   test_blog_db                                      │   │
│  │                                                     │   │
│  │   test_1 ─── 事务1 ─── ROLLBACK                    │   │
│  │   test_2 ─── 事务2 ─── ROLLBACK                    │   │
│  │   test_3 ─── 事务3 ─── ROLLBACK                    │   │
│  │                                                     │   │
│  │   最终数据库状态 = 初始状态（所有测试数据已回滚）    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 配置示例

**.env.test** (本地测试)：
```bash
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/test_blog_db
```

**.env** (Docker 生产)：
```bash
DATABASE_URL=postgresql+asyncpg://user:password@db:5432/blog_db
```

### 为什么需要两层隔离？

1. **物理隔离** (不同数据库)
   - 防止测试意外修改生产数据
   - 可以在测试数据库上随意操作
   - 不同环境可以有不同的数据

2. **测试内隔离** (嵌套事务)
   - 测试之间不互相影响
   - 测试可以并行运行
   - 测试失败不会留下脏数据

### 测试数据金字塔

```
                    ┌─────────┐
                    │  E2E    │  ← 少量，测试关键流程
                   ╱│ 测试    │╲
                  ╱ └─────────┘ ╲
                 ╱               ╲
                ╱  ┌───────────┐  ╲
               ╱   │   集成    │   ╲  ← 适量，测试模块交互
              ╱    │   测试    │    ╲
             ╱     └───────────┘     ╲
            ╱                         ╲
           ╱    ┌───────────────┐      ╲
          ╱     │    单元测试    │       ╲  ← 大量，测试具体函数
         ╱      │               │        ╲
        ╱       └───────────────────────┘ ╲
       └───────────────────────────────────┘

       单元测试: 不需要数据库，使用 mock
       集成测试: 使用测试数据库 + 事务回滚
       E2E 测试: 可能需要真实数据库，测试后清理
```

---

## 常见问题排查

### 问题 1: "attached to a different loop"

**症状**：
```
RuntimeError: Task ... got Future ... attached to a different loop
```

**原因**：fixtures 和测试函数使用了不同的事件循环

**解决**：
1. 检查 `pytest.ini` 配置是否统一
2. 移除手动创建的 `event_loop` fixture
3. 确保 `asyncio_default_fixture_loop_scope = session`

### 问题 2: 测试之间数据污染

**症状**：测试单独运行通过，一起运行失败

**原因**：前一个测试的数据影响了后面的测试

**解决**：
1. 确保 session fixture 在结束时 `await session.rollback()`
2. 或者在 setup 时清理相关数据

### 问题 3: 数据库连接池耗尽

**症状**：`asyncpg.exceptions.TooManyConnectionsError`

**原因**：每个测试都创建新的连接而没有复用

**解决**：
1. 使用 session scope 的 db_engine
2. 确保 engine 正确 dispose

### 问题 4: 依赖注入不生效

**症状**：测试使用了真实数据库而不是测试数据库

**原因**：`dependency_overrides` 设置不正确

**解决**：
```python
# 错误：返回值而不是生成器
app.dependency_overrides[get_async_session] = lambda: session

# 正确：返回生成器函数
async def override_get_session():
    yield session
app.dependency_overrides[get_async_session] = override_get_session
```

---

## 检查清单

在编写异步测试前，检查以下项目：

### 配置检查

- [ ] `pytest.ini` 中设置了 `asyncio_mode = auto`
- [ ] `pytest.ini` 中设置了 `asyncio_default_fixture_loop_scope = session`
- [ ] 没有手动定义 `event_loop` fixture（除非有特殊需求）

### Fixtures 检查

- [ ] 数据库引擎使用 `scope="session"`
- [ ] 数据库会话使用 `scope="function"`
- [ ] 会话结束时调用 `await session.rollback()`
- [ ] 依赖覆盖使用生成器函数而不是 lambda

### 测试函数检查

- [ ] 异步测试函数使用 `async def`
- [ ] 如果需要，添加 `@pytest.mark.asyncio`（auto 模式下通常不需要）
- [ ] 测试之间没有共享可变状态

### 清理检查

- [ ] 测试结束后清理 `app.dependency_overrides`
- [ ] session scope fixtures 在结束时正确清理资源
- [ ] 数据库连接池正确 dispose

---

## 参考资源

- [pytest-asyncio 官方文档](https://pytest-asyncio.readthedocs.io/)
- [SQLAlchemy 异步文档](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [FastAPI 测试文档](https://fastapi.tiangolo.com/tutorial/testing/)
- [httpx AsyncClient 文档](https://www.python-httpx.org/async/)
- [Starlette TestClient 源码](https://github.com/encode/starlette/blob/master/starlette/testclient.py)

---

## 附录：完整 conftest.py 示例

```python
"""
完整的异步测试配置示例
支持：事件循环共享、嵌套事务隔离、依赖注入覆盖
"""
import pytest
from typing import AsyncGenerator
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.db import Base, get_async_session
from app.core.config import settings

# 使用测试数据库
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
)


@pytest.fixture(scope="session")
async def db_engine():
    """Session 级别：创建表结构，整个测试会话只执行一次"""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield async_engine

    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await async_engine.dispose()


@pytest.fixture(scope="function")
async def session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Function 级别：每个测试独立的数据库会话
    使用嵌套事务（savepoint）保证隔离
    """
    async with db_engine.connect() as connection:
        transaction = await connection.begin()
        await connection.begin_nested()

        async_session_maker = async_sessionmaker(
            bind=connection,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )

        async with async_session_maker() as session:
            @event.listens_for(session.sync_session, "after_transaction_end")
            def reopen_nested_transaction(session, transaction):
                if connection.closed:
                    return
                if not connection.in_nested_transaction():
                    if connection.sync_connection:
                        connection.sync_connection.begin_nested()

            yield session

        await transaction.rollback()


@pytest.fixture(scope="function")
async def async_client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    异步测试客户端，覆盖数据库依赖
    """
    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        yield session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
```
