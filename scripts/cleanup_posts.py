import asyncio
import os
import sys

# 确保能导入 app
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.db import AsyncSessionLocal
from app.posts.model import Post, PostTagLink
from sqlalchemy import delete


async def cleanup_duplicates():
    # 要删除的 ID 列表
    target_ids = [
        "019ba0cb-c570-7794-9d9e-00ab196958ca",
        "019ba0e1-7536-755a-bcbc-8fc42e7f3cea",
    ]

    async with AsyncSessionLocal() as session:
        try:
            print(f"开始清理文章，目标 ID: {target_ids}")

            # 1. 删除标签关联 (SQLModel 里的 PostTagLink)
            # 注意：实际生产中如果设置了 cascade delete 则不需要这一步，但显然目前没设
            stmt_links = delete(PostTagLink).where(PostTagLink.post_id.in_(target_ids))
            await session.execute(stmt_links)
            print("已清理标签关联记录。")

            # 2. 删除文章
            stmt_posts = delete(Post).where(Post.id.in_(target_ids))
            await session.execute(stmt_posts)
            print("已清理文章记录。")

            await session.commit()
            print("🎉 清理成功！")

        except Exception as e:
            await session.rollback()
            print(f"❌ 清理失败，已回滚: {e}")


if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
