# ========================================
# 数据库命名约定配置
# ========================================
"""
配置 PostgreSQL 约束命名规则，确保 Alembic 自动生成的约束名称符合规范。

命名规则：
- ix: 索引 -> %(column_0_label)s_idx
- uq: 唯一约束 -> %(table_name)s_%(column_0_name)s_key
- ck: 检查约束 -> %(table_name)s_%(constraint_name)s_check
- fk: 外键 -> %(table_name)s_%(column_0_name)s_fkey
- pk: 主键 -> %(table_name)s_pkey
"""

# ========================================
# 导入依赖
# ========================================
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlmodel import Field, SQLModel
from uuid6 import uuid7

# ========================================
# PostgreSQL 命名约定
# ========================================
POSTGRES_NAMING_CONVENTION = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}

# 应用命名约定到 SQLModel 的 metadata
SQLModel.metadata.naming_convention = POSTGRES_NAMING_CONVENTION


# ========================================
# 时间工具函数
# ========================================


def get_now_shanghai_naive() -> datetime:
    """返回上海时区的 naive datetime"""
    tz_shanghai = timezone(timedelta(hours=8))
    return datetime.now(tz_shanghai).replace(tzinfo=None)


class Base(SQLModel):
    """基础模型，包含公共字段"""

    id: UUID = Field(default_factory=uuid7, primary_key=True)
    created_at: datetime = Field(default_factory=get_now_shanghai_naive, nullable=False)
    updated_at: datetime = Field(
        default_factory=get_now_shanghai_naive,
        nullable=False,
        sa_column_kwargs={"onupdate": get_now_shanghai_naive},
    )
