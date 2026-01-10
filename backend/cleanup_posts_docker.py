import asyncio
from uuid import UUID

from app.core.db import AsyncSessionLocal
from app.posts.model import Post, PostTagLink, PostVersion
from sqlalchemy import delete

# 导入相关模型以确保 SQLModel 注册表中有它们的定义，防止 Mapper 错误


async def cleanup():
    # 填入你想要删除的文章 ID
    target_ids = [
        UUID("019ba0cb-c570-7794-9d9e-00ab196958ca"),
        UUID("019ba0e1-7536-755a-bcbc-8fc42e7f3cea"),
    ]

    async with AsyncSessionLocal() as session:
        try:
            print(f"正在容器内清理文章: {target_ids}...")

            # 1. 删除版本快照（手动处理，确保外键不冲突）
            stmt_v = delete(PostVersion).where(PostVersion.post_id.in_(target_ids))
            await session.exec(stmt_v)

            # 2. 删除标签关联
            stmt_link = delete(PostTagLink).where(PostTagLink.post_id.in_(target_ids))
            await session.exec(stmt_link)

            # 3. 最后删除文章
            stmt_post = delete(Post).where(Post.id.in_(target_ids))
            result = await session.exec(stmt_post)

            await session.commit()
            print(f"🎉 成功！已在数据库中删除 {result.rowcount} 篇文章。")
        except Exception as e:
            await session.rollback()
            print(f"❌ 失败: {e}")


if __name__ == "__main__":
    asyncio.run(cleanup())
