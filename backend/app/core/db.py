"""
数据库连接配置

提供同步和异步的数据库会话
"""

from typing import AsyncGenerator

from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import create_engine

# ========================================
# 异步数据库引擎（推荐用于 FastAPI）
# ========================================
async_engine = create_async_engine(
    str(settings.async_postgres_url),
    echo=settings.database_echo,  # 开发环境显示 SQL，生产环境设为 False
    future=True,
    # 连接池配置（高并发性能优化）
    pool_size=20,          # 连接池大小（常驻连接数）
    max_overflow=10,       # 允许超出 pool_size 的额外连接数（总共最多 30 个连接）
    pool_timeout=30,       # 获取连接的超时时间（秒）
    pool_recycle=3600,     # 连接回收时间（秒），防止数据库断开长时间不用的连接
)

# 创建异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    异步数据库会话依赖项

    用于 FastAPI 路由中的依赖注入

    示例:
        @router.get("/users")
        async def get_users(session: AsyncSession = Depends(get_async_session)):
            result = await session.execute(select(User))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        yield session


# ========================================
# 同步数据库引擎（用于脚本、测试等）
# ========================================
sync_engine = create_engine(
    str(settings.postgres_url),
    echo=True,
)


def get_sync_session():
    """
    同步数据库会话（用于脚本、Jupyter Notebook 等）

    不推荐在 FastAPI 路由中使用
    """
    from sqlmodel import Session

    with Session(sync_engine) as session:
        yield session


# 为了向后兼容，保留 get_session 别名
get_session = get_async_session
engine = async_engine
