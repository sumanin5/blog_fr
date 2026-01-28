"""
测试标签去重逻辑

验证 get_or_create_tag 在处理重复标签时的行为，
确保无论是 name 还是 slug 重复，都能正确返回现有标签而不是创建重复记录。
"""

import pytest
from app.posts.cruds.tag import get_or_create_tag
from app.posts.model import Tag
from sqlmodel import select


@pytest.mark.unit
@pytest.mark.posts
async def test_get_or_create_tag_by_exact_match(session):
    """测试：完全匹配的标签名和 slug 应返回现有标签"""
    # 创建初始标签
    tag1 = await get_or_create_tag(session, name="Python", slug="python")
    await session.commit()

    # 尝试创建相同的标签
    tag2 = await get_or_create_tag(session, name="Python", slug="python")

    assert tag1.id == tag2.id
    assert tag1.name == tag2.name == "Python"
    assert tag1.slug == tag2.slug == "python"


@pytest.mark.unit
@pytest.mark.posts
async def test_get_or_create_tag_by_slug_match(session):
    """测试：slug 匹配但 name 不同时，应返回现有标签（防止 slug 冲突）"""
    # 创建初始标签
    tag1 = await get_or_create_tag(session, name="Python", slug="python")
    await session.commit()

    # 尝试用不同的 name 但相同的 slug 创建标签
    # 这模拟了从 Git 同步时遇到大小写不同的标签名
    tag2 = await get_or_create_tag(session, name="python", slug="python")

    assert tag1.id == tag2.id
    # 应该返回已存在的标签，而不是创建新的

    # 验证数据库中只有一个 slug="python" 的标签
    stmt = select(Tag).where(Tag.slug == "python")
    result = await session.exec(stmt)
    tags = result.all()
    assert len(tags) == 1


@pytest.mark.unit
@pytest.mark.posts
async def test_get_or_create_tag_by_name_match(session):
    """测试：name 匹配但 slug 不同时，应返回现有标签"""
    # 创建初始标签
    tag1 = await get_or_create_tag(session, name="JavaScript", slug="javascript")
    await session.commit()

    # 尝试用相同的 name 但不同的 slug 创建标签
    # 这种情况理论上不应该发生，但我们要确保逻辑健壮
    tag2 = await get_or_create_tag(session, name="JavaScript", slug="js")

    assert tag1.id == tag2.id


@pytest.mark.unit
@pytest.mark.posts
async def test_get_or_create_tag_creates_new_when_no_match(session):
    """测试：name 和 slug 都不匹配时，应创建新标签"""
    tag1 = await get_or_create_tag(session, name="React", slug="react")
    tag2 = await get_or_create_tag(session, name="Vue", slug="vue")
    await session.commit()

    assert tag1.id != tag2.id
    assert tag1.name == "React"
    assert tag2.name == "Vue"

    # 验证数据库中有两个不同的标签
    stmt = select(Tag)
    result = await session.exec(stmt)
    tags = result.all()
    assert len(tags) == 2


@pytest.mark.unit
@pytest.mark.posts
async def test_get_or_create_tag_case_insensitive_slug(session):
    """测试：slug 的大小写敏感性处理"""
    # 创建标签（通常 slug 会被 slugify 转为小写）
    tag1 = await get_or_create_tag(session, name="TypeScript", slug="typescript")
    await session.commit()

    # 尝试用相同的小写 slug 创建
    tag2 = await get_or_create_tag(session, name="Typescript", slug="typescript")

    # 应该返回同一个标签
    assert tag1.id == tag2.id

    # 验证数据库中只有一个标签
    stmt = select(Tag)
    result = await session.exec(stmt)
    tags = result.all()
    assert len(tags) == 1
