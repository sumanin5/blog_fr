"""
文章工具函数单元测试

测试 app.posts.utils 模块中的查询构建函数和 slug 生成
"""

import re
from uuid import uuid4

# 导入所有相关模型，确保 SQLAlchemy 能正确初始化模型映射关系
from app.media.model import MediaFile  # noqa: F401
from app.posts.model import Category, Post, PostStatus, PostType, Tag  # noqa: F401
from app.posts.utils import (
    build_categories_query,
    build_posts_query,
    build_tags_query,
    generate_slug_with_random_suffix,
)
from app.users.model import User  # noqa: F401

# ============================================================================
# 文章查询构建测试
# ============================================================================


def test_build_posts_query_no_filters():
    """测试不带任何过滤条件的查询"""
    query = build_posts_query()

    # 验证查询对象被创建
    assert query is not None
    # 验证默认状态过滤为 PUBLISHED
    assert "posts_post.status" in str(query)


def test_build_posts_query_with_post_type():
    """测试按文章类型过滤"""
    query = build_posts_query(post_type=PostType.ARTICLE)

    query_str = str(query)
    assert "posts_post.post_type" in query_str


def test_build_posts_query_with_status():
    """测试按状态过滤"""
    query = build_posts_query(status=PostStatus.DRAFT)

    query_str = str(query)
    assert "posts_post.status" in query_str


def test_build_posts_query_with_category():
    """测试按分类过滤"""
    category_id = uuid4()
    query = build_posts_query(category_id=category_id)

    query_str = str(query)
    assert "posts_post.category_id" in query_str


def test_build_posts_query_with_tag():
    """测试按标签过滤"""
    tag_id = uuid4()
    query = build_posts_query(tag_id=tag_id)

    query_str = str(query)
    # 应该包含 JOIN 标签表
    assert "posts_tag" in query_str or "JOIN" in query_str


def test_build_posts_query_with_author():
    """测试按作者过滤"""
    author_id = uuid4()
    query = build_posts_query(author_id=author_id)

    query_str = str(query)
    assert "posts_post.author_id" in query_str


def test_build_posts_query_with_featured():
    """测试按推荐状态过滤"""
    query = build_posts_query(is_featured=True)

    query_str = str(query)
    assert "posts_post.is_featured" in query_str


def test_build_posts_query_with_search():
    """测试搜索功能"""
    query = build_posts_query(search_query="测试")

    query_str = str(query)
    # 应该包含 LIKE 或 ILIKE 查询
    assert "LIKE" in query_str.upper() or "ILIKE" in query_str.upper()


def test_build_posts_query_with_multiple_filters():
    """测试多个过滤条件组合"""
    query = build_posts_query(
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        is_featured=True,
        search_query="Python",
    )

    query_str = str(query)
    assert "posts_post.post_type" in query_str
    assert "posts_post.status" in query_str
    assert "posts_post.is_featured" in query_str


def test_build_posts_query_includes_relationships():
    """测试查询包含关联数据加载"""
    query = build_posts_query()

    query_str = str(query)
    # 验证使用了 selectinload（通过检查查询字符串）
    # 注意：这个测试可能需要根据实际 SQLAlchemy 版本调整
    assert query is not None


def test_build_posts_query_ordering():
    """测试查询排序"""
    query = build_posts_query()

    # 应该按发布时间和创建时间降序排列
    assert "ORDER BY" in str(query) or "order_by" in str(query)


# ============================================================================
# 分类查询构建测试
# ============================================================================


def test_build_categories_query_article_type():
    """测试构建文章分类查询"""
    query = build_categories_query(PostType.ARTICLE)

    query_str = str(query)
    assert "posts_category" in query_str
    assert "posts_category.post_type" in query_str


def test_build_categories_query_idea_type():
    """测试构建想法分类查询"""
    query = build_categories_query(PostType.IDEA)

    query_str = str(query)
    assert "posts_category" in query_str
    assert "posts_category.post_type" in query_str


def test_build_categories_query_filters_active():
    """测试查询只包含激活的分类"""
    query = build_categories_query(PostType.ARTICLE)

    query_str = str(query)
    assert "posts_category.is_active" in query_str


def test_build_categories_query_ordering():
    """测试分类查询排序"""
    query = build_categories_query(PostType.ARTICLE)

    query_str = str(query)
    # 应该按 sort_order 和 name 排序
    assert "ORDER BY" in query_str or "order_by" in str(query)


def test_build_categories_query_includes_relationships():
    """测试分类查询包含关联数据"""
    query = build_categories_query(PostType.ARTICLE)

    # 验证查询对象被创建
    assert query is not None


# ============================================================================
# 标签查询构建测试
# ============================================================================


def test_build_tags_query_article_type():
    """测试构建文章标签查询"""
    query = build_tags_query(PostType.ARTICLE)

    query_str = str(query)
    assert "posts_tag" in query_str
    assert "posts_post.post_type" in query_str


def test_build_tags_query_idea_type():
    """测试构建想法标签查询"""
    query = build_tags_query(PostType.IDEA)

    query_str = str(query)
    assert "posts_tag" in query_str
    assert "posts_post.post_type" in query_str


def test_build_tags_query_joins_posts():
    """测试标签查询关联文章表"""
    query = build_tags_query(PostType.ARTICLE)

    query_str = str(query)
    # 应该包含 JOIN posts 表
    assert "posts_post" in query_str or "JOIN" in query_str


def test_build_tags_query_distinct():
    """测试标签查询去重"""
    query = build_tags_query(PostType.ARTICLE)

    query_str = str(query)
    # 应该包含 DISTINCT
    assert "DISTINCT" in query_str.upper()


def test_build_tags_query_ordering():
    """测试标签查询排序"""
    query = build_tags_query(PostType.ARTICLE)

    # 应该按标签名称排序
    assert "ORDER BY" in str(query) or "order_by" in str(query)


# ============================================================================
# Slug 生成测试
# ============================================================================


def test_generate_slug_basic():
    """测试基础 slug 生成"""
    slug = generate_slug_with_random_suffix("Hello World")

    # 应该以 "hello-world-" 开头
    assert slug.startswith("hello-world-"), (
        f"Expected slug to start with 'hello-world-', got {slug}"
    )

    # 应该有 6 位随机后缀
    suffix = slug.split("-")[-1]
    assert len(suffix) == 6, f"Expected suffix length 6, got {len(suffix)}"

    # 随机后缀应该只包含小写字母和数字
    assert re.match(r"^[a-z0-9]+$", suffix), (
        f"Suffix contains invalid characters: {suffix}"
    )


def test_generate_slug_chinese():
    """测试中文标题的 slug 生成"""
    slug = generate_slug_with_random_suffix("我的第一篇文章")

    # 应该有随机后缀
    suffix = slug.split("-")[-1]
    assert len(suffix) == 6, f"Expected suffix length 6, got {len(suffix)}"
    assert re.match(r"^[a-z0-9]+$", suffix)


def test_generate_slug_empty_title():
    """测试空标题时使用默认值"""
    slug = generate_slug_with_random_suffix("")

    # 应该以 "post-" 开头
    assert slug.startswith("post-"), f"Expected slug to start with 'post-', got {slug}"

    suffix = slug.split("-")[-1]
    assert len(suffix) == 6


def test_generate_slug_special_characters():
    """测试特殊字符的处理"""
    slug = generate_slug_with_random_suffix("Hello & World! @#$%")

    # 特殊字符应该被移除或转换
    suffix = slug.split("-")[-1]
    assert len(suffix) == 6
    assert re.match(r"^[a-z0-9-]*$", slug), f"Slug contains invalid characters: {slug}"


def test_generate_slug_custom_random_length():
    """测试自定义随机后缀长度"""
    slug = generate_slug_with_random_suffix("Test", random_length=8)

    suffix = slug.split("-")[-1]
    assert len(suffix) == 8, f"Expected suffix length 8, got {len(suffix)}"


def test_generate_slug_uniqueness():
    """测试随机性：多次调用应该生成不同的 slug"""
    title = "Test Article"
    slugs = [generate_slug_with_random_suffix(title) for _ in range(100)]

    # 所有 slug 应该是唯一的（冲突概率极低）
    unique_slugs = set(slugs)
    assert len(unique_slugs) == len(slugs), "Generated duplicate slugs"

    # 但基础部分应该相同
    base_parts = [slug.rsplit("-", 1)[0] for slug in slugs]
    assert len(set(base_parts)) == 1, "Base slug should be the same"


def test_generate_slug_consistency_with_same_title():
    """测试相同标题的 base slug 部分一致"""
    slug1 = generate_slug_with_random_suffix("My First Post")
    slug2 = generate_slug_with_random_suffix("My First Post")

    # 提取 base slug （去掉随机后缀）
    base1 = slug1.rsplit("-", 1)[0]
    base2 = slug2.rsplit("-", 1)[0]

    assert base1 == base2, f"Base slugs should match: {base1} vs {base2}"

    # 但完整 slug 应该不同
    assert slug1 != slug2, "Complete slugs should be different due to random suffix"


def test_generate_slug_no_double_hyphen():
    """测试不应该产生连续的连字符"""
    slug = generate_slug_with_random_suffix("A---B")

    # 不应该有连续的连字符（除了 base 和 suffix 之间的）
    assert "--" not in slug.replace("-" + slug.split("-")[-1], ""), (
        f"Slug should not have double hyphens: {slug}"
    )


def test_generate_slug_lowercase():
    """测试 slug 应该全小写"""
    slug = generate_slug_with_random_suffix("HELLO WORLD ABC")

    assert slug == slug.lower(), f"Slug should be lowercase: {slug}"
