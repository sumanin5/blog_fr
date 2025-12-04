"""
初始化数据脚本

用于在项目启动时预先创建必要的数据，例如超级管理员账号。
"""

import asyncio
import logging
import sys

# 确保可以导入 app 模块
sys.path.append(".")

from app.core.config import settings
from app.core.db import AsyncSessionLocal
from app.users.crud import create_superadmin_user, get_user_by_username
from app.users.schema import UserCreate

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def init_db() -> None:
    """初始化数据库数据"""
    async with AsyncSessionLocal() as session:
        try:
            await create_first_superuser(session)
        except Exception as e:
            logger.error(f"初始化数据失败: {e}")
            raise e


async def create_first_superuser(session) -> None:
    """创建默认超级管理员"""
    username = settings.FIRST_SUPERUSER
    password = settings.FIRST_SUPERUSER_PASSWORD
    email = settings.FIRST_SUPERUSER_EMAIL

    logger.info(f"正在检查超级管理员: {username}")

    user = await get_user_by_username(session, username)
    if not user:
        logger.info(f"超级管理员不存在，正在创建...")
        user_in = UserCreate(
            username=username,
            email=email,
            password=password,
            is_active=True,
            full_name="Initial Super Admin",
        )
        user = await create_superadmin_user(session, user_in)
        logger.info(f"超级管理员已创建 - 用户名: {user.username}, 密码: {password}")
    else:
        logger.info(f"超级管理员已存在，跳过创建。")


def main() -> None:
    logger.info("开始初始化服务数据")
    asyncio.run(init_db())
    logger.info("服务数据初始化完成")


if __name__ == "__main__":
    main()
