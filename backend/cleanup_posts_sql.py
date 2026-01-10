import asyncio

from app.core.db import AsyncSessionLocal
from sqlalchemy import text


async def cleanup():
    # 使用列表，asyncpg 配合 = ANY(:ids) 比较稳
    target_ids = [
        "019ba0cb-c570-7794-9d9e-00ab196958ca",
        "019ba0e1-7536-755a-bcbc-8fc42e7f3cea",
    ]

    async with AsyncSessionLocal() as session:
        try:
            print(f"正在通过原味 SQL 清理文章: {target_ids}...")

            # 使用 = ANY(:ids) 这种兼容性更好的语法
            # 1. 删除版本记录
            await session.execute(
                text("DELETE FROM posts_post_version WHERE post_id = ANY(:ids)"),
                {"ids": target_ids},
            )

            # 2. 删除标签关联
            await session.execute(
                text("DELETE FROM posts_post_tag_link WHERE post_id = ANY(:ids)"),
                {"ids": target_ids},
            )

            # 3. 删除文章本身
            result = await session.execute(
                text("DELETE FROM posts_post WHERE id = ANY(:ids)"), {"ids": target_ids}
            )

            await session.commit()
            print(f"🎉 成功！已删除 {result.rowcount} 篇文章及其关联数据。")
        except Exception as e:
            await session.rollback()
            print(f"❌ 失败: {e}")


if __name__ == "__main__":
    asyncio.run(cleanup())
