from datetime import datetime
from uuid import uuid4

import pytest
from app.git_ops.components.comparator import PostComparator
from app.posts.model import PostStatus, PostType


# Mock Post Object
class MockPost:
    """模拟 SQLAlchemy Post model"""

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


@pytest.mark.unit
def test_compare_perfect_match():
    """测试完全一致的情况"""
    category_id = uuid4()
    post = MockPost(
        title="Hello World",
        content_mdx="Content",
        post_type=PostType.ARTICLES,
        category_id=category_id,
        status=PostStatus.PUBLISHED,
        published_at=datetime(2025, 1, 1, 12, 0, 0),
    )

    # 模拟从 Frontmatter 解析出的数据
    new_data = {
        "title": "Hello World",
        "content_mdx": "Content",
        "post_type": "articles",  # String vs Enum
        "category_id": str(category_id),  # String vs UUID
        "status": "published",  # String vs Enum
        "published_at": "2025-01-01 12:00:00",  # String vs Datetime
    }

    changes = PostComparator.compare(post, new_data)
    assert changes == [], f"Should be no changes, but got: {changes}"


@pytest.mark.unit
def test_compare_datetime_mismatch():
    """测试时间不一致"""
    post = MockPost(published_at=datetime(2025, 1, 1, 12, 0, 0))
    new_data = {"published_at": "2025-01-02 12:00:00"}

    changes = PostComparator.compare(post, new_data)
    assert "published_at" in changes


@pytest.mark.unit
def test_compare_datetime_normalization():
    """
    测试时间规范化逻辑（重点防止回归）
    DB (Datetime with microseconds) vs MDX (String without microseconds)
    """
    # DB 里通常带有微秒
    post = MockPost(published_at=datetime(2025, 1, 1, 12, 0, 0, 123456))

    # MDX Frontmatter 里通常是字符串，不带微秒
    new_data = {"published_at": "2025-01-01 12:00:00"}

    changes = PostComparator.compare(post, new_data)

    # 我们的 _normalize_datetime 实现应该忽略微秒，或者将其格式化为 str
    # 如果格式化逻辑只取到秒，那么这两个应该被视为相等
    assert "published_at" not in changes, "Should normalize microseconds correctly"


@pytest.mark.unit
def test_compare_enum_normalization():
    """测试枚举规范化逻辑"""
    post = MockPost(post_type=PostType.ARTICLES)

    # Case 1: Same string value
    changes = PostComparator.compare(post, {"post_type": "articles"})
    assert "post_type" not in changes

    # Case 2: Different value
    changes = PostComparator.compare(post, {"post_type": "ideas"})
    assert "post_type" in changes


@pytest.mark.unit
def test_compare_uuid_normalization():
    """测试 UUID 规范化"""
    uid = uuid4()
    post = MockPost(category_id=uid)

    # String comparison
    changes = PostComparator.compare(post, {"category_id": str(uid)})
    assert "category_id" not in changes

    # None handling
    post_none = MockPost(category_id=None)
    changes = PostComparator.compare(post_none, {"category_id": None})
    assert "category_id" not in changes


@pytest.mark.unit
def test_compare_content_change():
    """测试内容变更"""
    post = MockPost(content_mdx="Old Content")
    new_data = {"content_mdx": "New Content"}

    changes = PostComparator.compare(post, new_data)
    assert (
        "content" in changes
    )  # Pay attention: key name is "content" in COMPARABLE_FIELDS


@pytest.mark.unit
def test_compare_none_handling():
    """测试 None 值的处理"""
    post = MockPost(excerpt=None)

    # None vs None
    assert not PostComparator.compare(post, {"excerpt": None})

    # None vs Value
    assert "excerpt" in PostComparator.compare(post, {"excerpt": "Some excerpt"})
