import pytest
from app.git_ops.components.processors.post_type import PostTypeProcessor
from app.posts.model import PostType


@pytest.fixture
def processor():
    return PostTypeProcessor()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_resolve_exact_match(processor):
    """测试精确匹配"""
    res = await processor._resolve_post_type("articles", None)
    assert res == PostType.ARTICLES

    res = await processor._resolve_post_type("ideas", None)
    assert res == PostType.IDEAS


@pytest.mark.unit
@pytest.mark.asyncio
async def test_resolve_case_insensitivity(processor):
    """测试大小写不敏感"""
    res = await processor._resolve_post_type("ARTICLES", None)
    assert res == PostType.ARTICLES

    res = await processor._resolve_post_type("Ideas", None)
    assert res == PostType.IDEAS


@pytest.mark.unit
@pytest.mark.asyncio
async def test_resolve_derived_priority(processor):
    """测试路径推导优先级高于 Frontmatter"""
    # Derived: ideas, Meta: articles -> Should be ideas
    res = await processor._resolve_post_type(meta_type="articles", derived_type="ideas")
    assert res == PostType.IDEAS


@pytest.mark.unit
@pytest.mark.asyncio
async def test_default_type(processor):
    """测试默认类型"""
    res = await processor._resolve_post_type(None, None)
    assert res == PostType.ARTICLES
