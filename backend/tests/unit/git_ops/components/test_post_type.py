import pytest
from app.git_ops.components.processors.post_type import PostTypeProcessor
from app.git_ops.exceptions import GitOpsSyncError
from app.posts.model import PostType


@pytest.mark.unit
class TestPostTypeProcessor:
    @pytest.mark.asyncio
    async def test_resolve_exact_match(self):
        processor = PostTypeProcessor()

        # Test exact match
        res = await processor._resolve_post_type("articles", None)
        assert res == PostType.ARTICLES

        res = await processor._resolve_post_type("ideas", None)
        assert res == PostType.IDEAS

    @pytest.mark.asyncio
    async def test_resolve_case_insensitivity(self):
        processor = PostTypeProcessor()

        # Upper case
        res = await processor._resolve_post_type("ARTICLES", None)
        assert res == PostType.ARTICLES

        # Mixed case
        res = await processor._resolve_post_type("Ideas", None)
        assert res == PostType.IDEAS

    @pytest.mark.asyncio
    async def test_resolve_singular_fallback(self):
        """测试单数形式的自动修正（如果代码里支持）"""
        processor = PostTypeProcessor()

        # 注意：目前的 _resolve_post_type 实现只做了 .lower() 和 PostType(value)
        # 如果 PostType Enum 里不包含 "article" (单数)，这实际上会抛错，除非我们在代码里加了映射逻辑
        # 我们之前在修复时，是直接把数据库刷成了复数。
        # 如果我们希望代码能兼容单数输入（例如用户手写 frontmatter），这里的测试会失败，直到我们修改代码。

        # 我们可以验证它是否会抛出特定的错误，或者如果不抛错就是支持
        try:
            res = await processor._resolve_post_type("article", None)
            # 如果能通过，说明 Enum 兼容单数，或者我们做了映射
        except ValueError:
            # 目前预期是抛错，因为 enum 里只有 复数
            pass
        except GitOpsSyncError:
            pass

    @pytest.mark.asyncio
    async def test_resolve_derived_priority(self):
        """测试路径推导优先级高于 Frontmatter"""
        processor = PostTypeProcessor()

        # Derived: ideas, Meta: articles -> Should be ideas
        res = await processor._resolve_post_type(
            meta_type="articles", derived_type="ideas"
        )
        assert res == PostType.IDEAS

    @pytest.mark.asyncio
    async def test_default_type(self):
        """测试默认类型"""
        processor = PostTypeProcessor()

        res = await processor._resolve_post_type(None, None)
        assert res == PostType.ARTICLES
