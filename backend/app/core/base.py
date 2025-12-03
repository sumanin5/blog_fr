# ========================================
# 时间函数（确保已定义）
# ========================================
from datetime import datetime, timedelta, timezone

from sqlmodel import Field, SQLModel
import uuid
from uuid6 import uuid7


def get_now_shanghai_naive() -> datetime:
    """返回上海时区的 naive datetime"""
    tz_shanghai = timezone(timedelta(hours=8))
    return datetime.now(tz_shanghai).replace(tzinfo=None)


class Base(SQLModel):
    """基础模型，包含公共字段"""

    id: uuid.UUID = Field(default_factory=uuid7, primary_key=True)
    created_at: datetime = Field(default_factory=get_now_shanghai_naive, nullable=False)
    updated_at: datetime = Field(
        default_factory=get_now_shanghai_naive,
        nullable=False,
        sa_column_kwargs={"onupdate": get_now_shanghai_naive},
    )
