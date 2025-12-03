# 异步测试事件循环冲突问题

## 问题描述

运行 pytest 异步测试时出现以下错误：

```
RuntimeError: Task <Task pending name='Task-6' ...> got Future <Future pending ...> attached to a different loop
```

## 错误原因

### 什么是事件循环？

事件循环 (Event Loop) 是 Python 异步编程的核心，它负责调度和执行所有异步任务。

```
┌─────────────────────────────────────┐
│           事件循环 (Event Loop)       │
│  ┌─────┐  ┌─────┐  ┌─────┐         │
│  │任务1│  │任务2│  │任务3│  ...     │
│  └─────┘  └─────┘  └─────┘         │
│     ↓        ↓        ↓            │
│  调度员按顺序执行这些异步任务          │
└─────────────────────────────────────┘
```

**关键规则**：异步资源（如数据库连接）在创建时绑定到某个事件循环，之后**只能在同一个事件循环中使用**。

### 为什么会有多个循环？

问题出在 pytest-asyncio 的配置。当配置不当时，pytest-asyncio 可能为不同的 fixtures 和测试函数创建不同的事件循环：

```
pytest 开始运行
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ 阶段1: 创建 session 级别的 fixtures                       │
│                                                         │
│   db_engine fixture 创建 → 数据库连接绑定到【循环 A】       │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ 阶段2: 运行测试函数                                       │
│                                                         │
│   pytest-asyncio 为测试函数创建 → 【循环 B】 (新的!)        │
│                 │                                       │
│                 ▼                                       │
│   💥 尝试在【循环 B】中使用【循环 A】的数据库连接            │
│   → RuntimeError: attached to a different loop          │
└─────────────────────────────────────────────────────────┘
```

### 配置问题

原有配置：
```ini
asyncio_default_fixture_loop_scope = session  # fixture 用 session 级别循环
# 但测试函数默认用 function 级别循环！
```

这导致了 fixture 和测试函数使用不同的事件循环。

## 解决方案

### 核心思路

**统一所有组件使用同一个事件循环**。整个测试会话只需要一个事件循环。

### 修改 pyproject.toml

将 pytest 配置放在 `pyproject.toml` 中更加统一（删除单独的 `pytest.ini` 文件）：

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

**重要**：必须同时设置 `asyncio_default_fixture_loop_scope` 和 `asyncio_default_test_loop_scope` 为 `session`。

### 修改 conftest.py

关键改动：

1. **移除手动创建的 `event_loop` fixture** - pytest-asyncio 会自动管理
2. **确保测试数据隔离** - 使用事务回滚而不是重建表

```python
# 不再需要手动定义 event_loop
# pytest-asyncio 会自动创建 session 级别的事件循环

@pytest.fixture(scope="function")
async def session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    async_session_maker = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session_maker() as session:
        yield session
        # 关键：回滚确保测试隔离
        await session.rollback()
```

## Python vs Rust 异步模型对比

| 特性 | Python asyncio | Rust async |
|------|---------------|------------|
| 异步模型 | 基于事件循环 | 基于状态机 |
| Future 绑定 | 绑定到创建它的事件循环 | 可在任何执行器运行 |
| 线程安全 | 单线程事件循环内安全 | 需要 Send/Sync trait |
| 资源管理 | 资源绑定到特定循环 | 资源独立于执行器 |

Python 的这种设计是历史原因和简化实现的结果，但确实会带来一些限制。

## 总结

- **问题**：pytest-asyncio 创建了多个事件循环，导致数据库连接无法跨循环使用
- **原因**：fixture 和测试函数的事件循环作用域不一致
- **解决**：统一使用 session 级别的事件循环
- **最佳实践**：一个测试会话 = 一个事件循环 + 事务回滚保证隔离
