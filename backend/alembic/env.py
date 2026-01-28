import asyncio
import os

# ------------------ V V V 添加以下代码 V V V ------------------
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# 将项目根目录（backend）添加到 Python 路径
# os.path.dirname(__file__) -> /home/tomy/blog_fr/backend/alembic
# os.path.dirname(...) -> /home/tomy/blog_fr/backend
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.analytics.model import AnalyticsEvent  # noqa: F401
from app.core.base import Base  # 导入你的 Base 模型
from app.core.config import settings  # 导入 Pydantic settings
from app.media.model import MediaFile  # noqa: F401
from app.posts.model import Post  # noqa: F401
from app.users.model import User  # noqa: F401

# from app.posts.model import Post # 示例：以后有新模型就加在这里
#

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata


# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # ------------------ V V V 添加/修改以下代码 V V V ------------------

    # 从 alembic.ini 获取配置段
    alembic_config = config.get_section(config.config_ini_section)

    # 使用 app/core/config.py 中的异步 URL 覆盖 alembic.ini 中的 sqlalchemy.url
    # str() 是必须的，因为 settings.async_postgres_url 是 Pydantic 的 PostgresDsn 对象
    alembic_config["sqlalchemy.url"] = str(settings.async_postgres_url)

    connectable = async_engine_from_config(
        alembic_config,  # 使用我们刚刚修改过的配置
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    # --------------------------------------------------------------------

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
