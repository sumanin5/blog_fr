import pytest
from app.core.db import async_engine, sync_engine
from sqlalchemy import text
from sqlmodel import Session
from sqlmodel.ext.asyncio.session import AsyncSession


@pytest.mark.unit
def test_sync_connection():
    """测试同步数据库连接"""
    try:
        with Session(sync_engine) as session:
            # 执行一个简单的查询，例如 SELECT 1
            result = session.exec(text("SELECT 1"))  # type: ignore
            assert result.one() == (1,)
        print("\n同步数据库连接成功！")
    except Exception as e:
        pytest.fail(f"同步数据库连接失败: {e}")


@pytest.mark.asyncio
async def test_async_connection():
    """测试异步数据库连接"""
    try:
        # 使用异步引擎建立会话
        async with AsyncSession(async_engine) as session:
            # 执行异步查询
            result = await session.execute(text("SELECT 1"))
            assert result.scalar() == 1
        print("\n异步数据库连接成功！")
    except Exception as e:
        pytest.fail(f"异步数据库连接失败: {e}")
