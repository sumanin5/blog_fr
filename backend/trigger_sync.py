import asyncio
import sys

# 设置项目根目录到 Python 路径
project_root = "/home/tomy/projects/python/web/blog/blog_fr/backend"
sys.path.append(project_root)

from app.db.session import async_session_factory
from app.git_ops.container import GitOpsContainer


async def trigger_test_sync():
    # 模拟容器
    async with async_session_factory() as session:
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
