#!/usr/bin/env python3
"""
重置管理员用户脚本

用于重置或更新管理员用户信息
"""

import asyncio
import logging
import sys
from typing import Optional

# 确保可以导入 app 模块
sys.path.append(".")

from app.core.config import settings
from app.core.db import AsyncSessionLocal
from app.users.crud import create_superadmin_user, get_user_by_username, delete_user
from app.users.schema import UserCreate

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def reset_admin_user(
    new_username: Optional[str] = None,
    new_password: Optional[str] = None,
    new_email: Optional[str] = None
) -> None:
    """重置管理员用户"""
    async with AsyncSessionLocal() as session:
        try:
            # 使用提供的值或默认配置
            username = new_username or settings.FIRST_SUPERUSER
            password = new_password or settings.FIRST_SUPERUSER_PASSWORD
            email = new_email or settings.FIRST_SUPERUSER_EMAIL

            logger.info(f"正在重置管理员用户: {username}")

            # 查找现有管理员
            existing_user = await get_user_by_username(session, username)

            if existing_user:
                logger.info(f"删除现有管理员用户: {existing_user.username}")
                await delete_user(session, existing_user.id)

            # 创建新管理员
            logger.info(f"创建新管理员用户...")
            user_in = UserCreate(
                username=username,
                email=email,
                password=password,
                is_active=True,
                full_name="Reset Super Admin",
            )

            user = await create_superadmin_user(session, user_in)
            logger.info(f"✅ 管理员用户已重置")
            logger.info(f"   用户名: {user.username}")
            logger.info(f"   邮箱: {user.email}")
            logger.info(f"   密码: {password}")

        except Exception as e:
            logger.error(f"❌ 重置管理员用户失败: {e}")
            raise e


def main() -> None:
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="重置管理员用户")
    parser.add_argument("--username", help="新用户名")
    parser.add_argument("--password", help="新密码")
    parser.add_argument("--email", help="新邮箱")

    args = parser.parse_args()

    logger.info("🔄 开始重置管理员用户")
    asyncio.run(reset_admin_user(
        new_username=args.username,
        new_password=args.password,
        new_email=args.email
    ))
    logger.info("✅ 管理员用户重置完成")


if __name__ == "__main__":
    main()
