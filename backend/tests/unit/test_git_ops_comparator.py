"""
GitOps PostComparator 单元测试

测试 Post 对象对比器的核心逻辑
"""

from uuid import uuid4

import pytest
from app.git_ops.components.comparator import PostComparator
from app.posts.model import Post, PostStatus, PostType


@pytest.mark.unit
@pytest.mark.git_ops
class TestPostComparator:
    """PostComparator 单元测试"""

    @pytest.fixture
    def base_post(self):
        """创建基础 Post 对象"""
        return Post(
            id=uuid4(),
            title="Original Title",
            slug="original-slug",
            content_mdx="# Original Content",
            excerpt="Original excerpt",
            category_id=uuid4(),
            post_type=PostType.ARTICLE,
            status=PostStatus.PUBLISHED,
        )

    def test_compare_returns_list(self, base_post):
        """测试返回值是列表"""
        new_data = {"title": "Original Title"}
        result = PostComparator.compare(base_post, new_data)
        assert isinstance(result, list)

    def test_compare_detects_changes(self, base_post):
        """测试能检测到变化"""
        new_data = {"title": "New Title"}
        changes = PostComparator.compare(base_post, new_data)
        assert len(changes) > 0

    def test_compare_no_changes_when_same(self, base_post):
        """测试相同数据时无变化"""
        # 构建完整的新数据，所有字段都相同
        new_data = {
            field: getattr(base_post, post_field)
            for _, (post_field, field, _) in PostComparator.COMPARABLE_FIELDS.items()
        }
        changes = PostComparator.compare(base_post, new_data)
        assert changes == []

    def test_compare_uuid_normalization(self, base_post):
        """测试 UUID 规范化"""
        # 用字符串形式的 UUID
        new_data = {"category_id": str(base_post.category_id)}
        changes = PostComparator.compare(base_post, new_data)
        # category 不应该在变化列表中
        assert "category" not in changes

    def test_compare_status_enum_normalization(self, base_post):
        """测试状态 Enum 规范化"""
        base_post.status = PostStatus.PUBLISHED
        # 用字符串形式的状态
        new_data = {"status": "published"}
        changes = PostComparator.compare(base_post, new_data)
        # status 不应该在变化列表中
        assert "status" not in changes

    def test_add_comparable_field(self, base_post):
        """测试动态添加字段"""
        initial_count = len(PostComparator.COMPARABLE_FIELDS)

        PostComparator.add_comparable_field(
            display_name="test_field",
            post_field="reading_time",
            data_field="reading_time",
        )

        assert len(PostComparator.COMPARABLE_FIELDS) == initial_count + 1
        assert "test_field" in PostComparator.COMPARABLE_FIELDS

        # 清理
        del PostComparator.COMPARABLE_FIELDS["test_field"]

    def test_comparable_fields_structure(self):
        """测试 COMPARABLE_FIELDS 结构"""
        for name, config in PostComparator.COMPARABLE_FIELDS.items():
            assert isinstance(config, tuple)
            assert len(config) == 3
            post_field, data_field, normalize_fn = config
            assert isinstance(post_field, str)
            assert isinstance(data_field, str)
            # normalize_fn 可以是 None 或可调用
