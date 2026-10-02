import os
import sys
from typing import AsyncGenerator

import pytest

# 将项目根目录（backend 目录）添加到 Python 的模块搜索路径中
# 这样 pytest 就能找到 'app' 模块了
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

os.environ["ENVIRONMENT"] = (
    "test"  # 设置环境变量为测试环境，以便导入的是.env.test 文件，实现环境隔离
)




from app.core.base import Base
from app.core.db import async_engine
from fastapi_pagination import add_pagination
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession


# 添加分页支持
@pytest.fixture(scope="session", autouse=True)
def setup_pagination():
    """初始化 fastapi-pagination（全局配置）

    目的：
    - Posts 模块使用 fastapi-pagination 进行分页
    - 测试环境需要初始化分页上下文
    - 设置为 session 级别，所有测试共享
    - autouse=True 表示自动执行，无需手动调用
    """
    from app.main import app

    add_pagination(app)
    yield


# ============================================================
# 数据库 Fixtures
# ============================================================

# 注意：不再需要手动定义 event_loop fixture
# pytest-asyncio 会根据 asyncio_default_fixture_loop_scope=session
# 自动创建一个 session 级别的事件循环供所有测试共享


@pytest.fixture(scope="session")
async def db_engine():
    """
    创建测试数据库引擎（会话级，整个测试只创建一次）

    这个 fixture 在整个测试会话开始时：
    1. 创建所有数据库表
    2. 返回数据库引擎供其他 fixtures 使用

    测试会话结束时：
    1. 删除所有表（清理测试数据）
    2. 关闭数据库连接池
    """
    # 创建所有表
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield async_engine

    # 测试结束后删除所有表（清理）
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    # 关闭引擎
    await async_engine.dispose()


@pytest.fixture(scope="function")
async def session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    创建数据库会话（函数级，每个测试独立）

    关键设计：使用嵌套事务 (Savepoint) 实现真正的测试隔离

    原理：
    1. 开启一个外层事务（不会自动提交）
    2. 应用代码中的 commit() 实际上只是提交到 savepoint
    3. 测试结束时回滚外层事务，撤销所有更改

    这样即使应用代码调用了 session.commit()，
    数据也不会真正写入数据库，测试结束后会被完全回滚。
    """
    # 创建连接并开启外层事务
    async with db_engine.connect() as conn:
        # 开启外层事务
        await conn.begin()

        # 创建绑定到这个连接的 session
        async_session_maker = async_sessionmaker(
            bind=conn,
            class_=AsyncSession,
            expire_on_commit=False,
            # 关键：使用 savepoint 作为嵌套事务
            # 这样应用代码的 commit() 只会提交到 savepoint
            # 🔥 关键修改：告诉 Session，当你调用 commit 时，
            # 不要真的 commit 事务，而是创建一个 savepoint。
            join_transaction_mode="create_savepoint",
        )

        async with async_session_maker() as session:
            # 开启 savepoint，后续的 commit 都只提交到这个 savepoint
            await conn.begin_nested()

            yield session

        # 回滚外层事务，撤销所有更改（包括 savepoint 的提交）
        await conn.rollback()
