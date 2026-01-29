from app.core.db import engine
from app.initial_data import create_first_superuser
from fastapi import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, text

# Import all models to ensure they are registered

router = APIRouter()


@router.post("/db/reset")
async def reset_db():
    """
    重置数据库：删除所有表并重新创建。
    仅用于测试环境。
    """
    async with engine.begin() as conn:
        # 禁用外键检查以避免删除顺序问题（特别是 SQLite）
        if engine.name == "sqlite":
            await conn.execute(text("PRAGMA foreign_keys = OFF"))

        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)

        if engine.name == "sqlite":
            await conn.execute(text("PRAGMA foreign_keys = ON"))

    # 重新初始化超级管理员，方便测试登录
    # 我们需要一个新的 session
    async with AsyncSession(engine) as session:
        await create_first_superuser(session)
        await session.commit()

    return {"message": "Database reset and initialized successfully"}
