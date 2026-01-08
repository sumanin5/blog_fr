import pytest
from sqlalchemy import select
from sqlmodel.ext.asyncio.session import AsyncSession
from tests.database.model import Student

# ============================================================
# 数据库 CRUD 测试
# ============================================================
# 注意：
# 1. 所有测试都使用 session fixture
# 2. session fixture 已经配置了自动回滚（Savepoint）
# 3. 测试结束后，数据库中不会留下任何数据
# ============================================================


@pytest.mark.asyncio
async def test_create_student(session: AsyncSession):
    """测试创建学生"""
    # 1. 创建数据
    student = Student(name="Alice", age=20, grade="A")
    session.add(student)
    await session.commit()  # 这里实际上只是提交到了 Savepoint

    # 2. 验证数据已保存
    # 刷新对象以获取 ID (因为是自增/生成的主键)
    await session.refresh(student)
    assert student.id is not None
    assert student.name == "Alice"

    # 3. 从数据库查询验证
    stmt = select(Student).where(Student.name == "Alice")
    result = await session.execute(stmt)
    db_student = result.scalar_one_or_none()

    assert db_student is not None
    assert db_student.name == "Alice"
    assert db_student.age == 20


@pytest.mark.asyncio
async def test_read_student(session: AsyncSession):
    """测试查询学生"""
    # 准备数据
    student1 = Student(name="Bob", age=21, grade="B")
    student2 = Student(name="Charlie", age=22, grade="C")
    session.add_all([student1, student2])
    await session.commit()

    # 查询单个
    stmt = select(Student).where(Student.name == "Bob")
    result = await session.execute(stmt)
    bob = result.scalar_one_or_none()
    assert bob is not None
    assert bob.age == 21

    # 查询所有
    stmt = select(Student).order_by(Student.age)
    result = await session.execute(stmt)
    students = result.scalars().all()
    assert (
        len(students) >= 2
    )  # 注意：如果其他测试并行运行可能会有更多，但在 function scope 下通常是隔离的


@pytest.mark.asyncio
async def test_update_student(session: AsyncSession):
    """测试更新学生"""
    # 准备数据
    student = Student(name="David", age=23, grade="D")
    session.add(student)
    await session.commit()

    # 更新数据
    student.grade = "A+"
    session.add(student)
    await session.commit()
    await session.refresh(student)

    # 验证更新
    assert student.grade == "A+"

    # 重新查询验证
    stmt = select(Student).where(Student.name == "David")
    result = await session.execute(stmt)
    updated_student = result.scalar_one_or_none()
    assert updated_student.grade == "A+"


@pytest.mark.asyncio
async def test_delete_student(session: AsyncSession):
    """测试删除学生"""
    # 准备数据
    student = Student(name="Eve", age=24)
    session.add(student)
    await session.commit()

    # 确认存在
    stmt = select(Student).where(Student.name == "Eve")
    result = await session.execute(stmt)
    assert result.scalar_one_or_none() is not None

    # 删除数据
    await session.delete(student)
    await session.commit()

    # 验证已删除
    stmt = select(Student).where(Student.name == "Eve")
    result = await session.execute(stmt)
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_transaction_rollback_demo(session: AsyncSession):
    """
    演示事务回滚
    即便在这个测试中 commit 了数据，
    也不会影响其他测试，也不会保留在数据库中。
    """
    student = Student(name="Frank", age=25)
    session.add(student)
    await session.commit()

    # 在当前 session 中是存在的
    stmt = select(Student).where(Student.name == "Frank")
    result = await session.execute(stmt)
    assert result.scalar_one_or_none() is not None

    # 只要测试函数结束，conftest.py 中的 session fixture 就会执行 rollback
    # 数据就会消失
