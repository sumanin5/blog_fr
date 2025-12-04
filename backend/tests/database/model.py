from typing import Optional
from app.core.base import Base
from sqlmodel import Field

class Student(Base, table=True):
    """
    测试用的学生模型
    仅用于 tests/database/test_crud.py 测试
    """
    __tablename__ = "test_students"

    name: str = Field(index=True)
    age: int
    grade: Optional[str] = None
