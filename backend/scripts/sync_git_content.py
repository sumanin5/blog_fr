#!/usr/bin/env python3
"""
Git 内容同步命令行脚本

用法：
    python scripts/sync_git_content.py

或者：
    python -m scripts.sync_git_content
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 必须导入 MediaFile 模型，否则 SQLAlchemy 在初始化 Category 关系时会找不到 'MediaFile'
import app.media.model  # noqa
from app.core.db import get_async_session
from app.git_ops.service import GitOpsService
from app.users.model import User, UserRole
from sqlmodel import select


async def main():
    """执行 Git 内容同步"""
    print("🚀 开始 Git 内容同步...")
    print("-" * 50)

    # 获取数据库会话
    async for session in get_async_session():
        try:
            # 查找管理员用户（优先 superadmin，其次 admin）
            stmt = (
                select(User)
                .where(User.role.in_([UserRole.SUPERADMIN, UserRole.ADMIN]))
                .limit(1)
            )
            result = await session.exec(stmt)
            admin_user = result.first()

            if not admin_user:
                print("❌ 错误：未找到管理员用户")
                print("请先运行: python scripts/reset_admin.py")
                return 1

            print(f"✅ 操作用户: {admin_user.username} ({admin_user.role.value})")
            print()

            # 执行同步
            service = GitOpsService(session)
            stats = await service.sync_all(default_user=admin_user)

            # 输出结果
            print("📊 同步完成！")
            print("-" * 50)
            print(f"✨ 新增: {len(stats.added)} 篇")
            print(f"🔄 更新: {len(stats.updated)} 篇")
            print(f"🗑️  删除: {len(stats.deleted)} 篇")
            print(f"⏭️  跳过: {stats.skipped} 篇")
            print(f"⏱️  耗时: {stats.duration:.2f} 秒")

            if stats.errors:
                print(f"\n⚠️  错误: {len(stats.errors)} 个")
                for error in stats.errors:
                    print(f"  - {error}")
                return 1

            print("\n✅ 同步成功！")
            return 0

        except Exception as e:
            print(f"\n❌ 同步失败: {e}")
            import traceback

            traceback.print_exc()
            return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
