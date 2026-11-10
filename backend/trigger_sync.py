import asyncio

from app.core.db import AsyncSessionLocal
from app.git_ops.container import GitOpsContainer

async def trigger_test_sync():
    # 模拟容器
    async with AsyncSessionLocal() as session:
        container = GitOpsContainer(session)
        sync_service = container.sync_service

        print("🚀 开始同步...")
        # 执行全量同步
        stats = await sync_service.sync_all()

        print("✅ 同步完成！")
        print(
            f"统计信息: 新增 {len(stats.added)}, 更新 {len(stats.updated)}, 删除 {len(stats.deleted)}"
        )


if __name__ == "__main__":
    asyncio.run(trigger_test_sync())
