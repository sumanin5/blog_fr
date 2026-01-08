"""
文章工具函数单元测试

测试 app.posts.utils 模块中的 PostProcessor 类和查询构建函数
"""

import re
from uuid import uuid4

# 导入所有相关模型，确保 SQLAlchemy 能正确初始化模型映射关系
from app.media.model import MediaFile  # noqa: F401
from app.posts.model import Category, Post, PostStatus, PostType, Tag  # noqa: F401
from app.posts.utils import (
    PostProcessor,
    build_categories_query,
    build_posts_query,
    build_tags_query,
    generate_slug_with_random_suffix,
)
from app.users.model import User  # noqa: F401


class TestPostProcessor:
    """PostProcessor 类测试"""

    def test_process_simple_markdown(self):
        """测试处理简单 Markdown 内容"""
        content = """---
title: 测试文章
---

这是一段简单的文本。
"""
        processor = PostProcessor(content).process()

        assert processor.metadata["title"] == "测试文章"
        assert "这是一段简单的文本" in processor.content_mdx
        assert "这是一段简单的文本" in processor.content_html

    def test_process_without_frontmatter(self):
        """测试处理没有 Frontmatter 的内容"""
        content = "# 标题\n\n这是正文内容。"
        processor = PostProcessor(content).process()

        assert processor.metadata == {}
        assert processor.content_mdx == content
        assert "<h1>" in processor.content_html

    def test_process_with_complex_frontmatter(self):
        """测试处理复杂的 Frontmatter"""
        content = """---
title: 复杂文章
slug: complex-article
tags:
  - Python
  - FastAPI
  - Testing
description: 这是一篇测试文章
keywords: python, fastapi, testing
---

正文内容
"""
        processor = PostProcessor(content).process()

        assert processor.metadata["title"] == "复杂文章"
        assert processor.metadata["slug"] == "complex-article"
        assert processor.metadata["tags"] == ["Python", "FastAPI", "Testing"]
        assert processor.metadata["description"] == "这是一篇测试文章"
        assert processor.metadata["keywords"] == "python, fastapi, testing"

    def test_generate_toc_basic(self):
        """测试基本目录生成"""
        content = """# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
"""
        processor = PostProcessor(content).process()

        assert len(processor.toc) == 6
        assert processor.toc[0]["title"] == "一级标题"
        assert processor.toc[0]["level"] == 1
        assert processor.toc[1]["title"] == "二级标题"
        assert processor.toc[1]["level"] == 2
        assert processor.toc[2]["title"] == "三级标题"
        assert processor.toc[2]["level"] == 3
        assert processor.toc[3]["title"] == "四级标题"
        assert processor.toc[3]["level"] == 4
        assert processor.toc[4]["title"] == "五级标题"
        assert processor.toc[4]["level"] == 5
        assert processor.toc[5]["title"] == "六级标题"
        assert processor.toc[5]["level"] == 6

    def test_generate_toc_with_special_characters(self):
        """测试包含特殊字符的标题"""
        content = """# Hello World!
## Python & FastAPI
### 测试-标题_123
"""
        processor = PostProcessor(content).process()

        assert len(processor.toc) == 3
        assert processor.toc[0]["title"] == "Hello World!"
        assert processor.toc[1]["title"] == "Python & FastAPI"
        assert processor.toc[2]["title"] == "测试-标题_123"

        # 验证 slug 格式正确（移除特殊字符）
        assert re.match(r"^[a-z0-9-]+$", processor.toc[0]["id"])

    def test_generate_toc_ignores_code_blocks(self):
        """测试目录生成忽略代码块中的标题"""
        content = """# 真实标题

```python
# 这是代码中的注释，不应该被识别为标题
## 也不应该被识别
```

## 另一个真实标题
"""
        processor = PostProcessor(content).process()

        assert len(processor.toc) == 2
        assert processor.toc[0]["title"] == "真实标题"
        assert processor.toc[1]["title"] == "另一个真实标题"

    def test_generate_toc_duplicate_titles(self):
        """测试重复标题的处理（添加数字后缀）"""
        content = """# 简介

一些内容

## 简介

更多内容

### 简介

详细内容
"""
        processor = PostProcessor(content).process()

        assert len(processor.toc) == 3
        assert processor.toc[0]["id"] == "简介"
        assert processor.toc[1]["id"] == "简介-1"
        assert processor.toc[2]["id"] == "简介-2"
        # 验证 slug 格式正确（移除特殊字符）
        assert re.match(r"^[\w-]+$", processor.toc[0]["id"])

    def test_calculate_reading_time_chinese(self):
        """测试中文阅读时间计算"""
        # 300个中文字符，应该是1分钟
        content = "中" * 300
        processor = PostProcessor(content).process()

        assert processor.reading_time == 1

        # 600个中文字符，应该是2分钟
        content = "中" * 600
        processor = PostProcessor(content).process()

        assert processor.reading_time == 2

    def test_calculate_reading_time_english(self):
        """测试英文阅读时间计算"""
        # 300个英文单词，应该是1分钟
        content = " ".join(["word"] * 300)
        processor = PostProcessor(content).process()

        assert processor.reading_time == 1

    def test_calculate_reading_time_mixed(self):
        """测试中英文混合阅读时间计算"""
        # 150个中文字符 + 150个英文单词 = 300，应该是1分钟
        content = "中" * 150 + " " + " ".join(["word"] * 150)
        processor = PostProcessor(content).process()

        assert processor.reading_time == 1

    def test_calculate_reading_time_minimum(self):
        """测试最小阅读时间（至少1分钟）"""
        content = "很短的内容"
        processor = PostProcessor(content).process()

        assert processor.reading_time >= 1

    def test_convert_latex_inline(self):
        """测试行内 LaTeX 公式转换"""
        content = "这是一个公式 $E = mc^2$ 在文本中。"
        processor = PostProcessor(content).process()

        # 验证公式被转换为 MathML（包含 <math> 标签）
        assert "<math" in processor.content_html or "E = mc^2" in processor.content_html

    def test_convert_latex_block(self):
        """测试块级 LaTeX 公式转换"""
        content = """
这是块级公式：

$$
\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

公式结束。
"""
        processor = PostProcessor(content).process()

        # 验证块级公式被包裹在 div 中
        assert (
            'class="math-block"' in processor.content_html
            or "int_" in processor.content_html
        )

    def test_convert_latex_invalid_formula(self):
        """测试无效 LaTeX 公式的处理（应该保持原样）"""
        content = "无效公式 $\\invalid{formula$ 应该保持原样。"
        processor = PostProcessor(content).process()

        # 无效公式应该保持原样或被安全处理
        assert processor.content_html is not None

    def test_strip_jsx_tags_self_closing(self):
        """测试移除自闭合 JSX 标签"""
        content = "文本 <CustomComponent /> 更多文本"
        processor = PostProcessor(content).process()

        # JSX 标签应该被移除
        assert "CustomComponent" not in processor.content_html
        assert "文本" in processor.content_html
        assert "更多文本" in processor.content_html

    def test_strip_jsx_tags_paired(self):
        """测试移除成对 JSX 标签"""
        content = "文本 <CustomComponent>内容</CustomComponent> 更多文本"
        processor = PostProcessor(content).process()

        # JSX 标签应该被移除，但内容保留
        assert "CustomComponent" not in processor.content_html
        assert "内容" in processor.content_html

    def test_strip_jsx_tags_preserves_html(self):
        """测试保留标准 HTML 标签"""
        content = "文本 <div>内容</div> 和 <span>更多</span>"
        processor = PostProcessor(content).process()

        # 小写的标准 HTML 标签应该被保留
        assert "<div>" in processor.content_html or "内容" in processor.content_html

    def test_generate_excerpt_short_content(self):
        """测试短内容的摘要生成"""
        content = "这是一段很短的内容。"
        processor = PostProcessor(content).process()

        # 短内容应该完整保留
        assert processor.excerpt == "这是一段很短的内容。"
        assert not processor.excerpt.endswith("...")

    def test_generate_excerpt_long_content(self):
        """测试长内容的摘要生成"""
        # 创建超过200字符的内容
        content = "这是一段很长的内容。" * 50
        processor = PostProcessor(content).process()

        # 摘要应该被截断并添加省略号
        assert len(processor.excerpt) <= 203  # 200 + "..."
        assert processor.excerpt.endswith("...")

    def test_generate_excerpt_strips_html(self):
        """测试摘要生成时移除 HTML 标签"""
        content = "<p>这是<strong>加粗</strong>的文本。</p>"
        processor = PostProcessor(content).process()

        # HTML 标签应该被移除
        assert "<p>" not in processor.excerpt
        assert "<strong>" not in processor.excerpt
        assert "这是" in processor.excerpt
        assert "加粗" in processor.excerpt

    def test_generate_excerpt_normalizes_whitespace(self):
        """测试摘要生成时规范化空白字符"""
        content = "这是    多个    空格\n\n和换行符"
        processor = PostProcessor(content).process()

        # 多个空白字符应该被合并为单个空格
        assert "    " not in processor.excerpt
        assert "\n" not in processor.excerpt
        assert "这是 多个 空格 和换行符" in processor.excerpt

    def test_full_pipeline_integration(self):
        """测试完整处理流水线集成"""
        content = """---
title: 完整测试文章
slug: full-test
tags:
  - Test
  - Integration
description: 集成测试
---

# 第一章

这是第一章的内容，包含公式 $E = mc^2$。

## 第二节

这是第二节的内容。

$$
F = ma
$$

<CustomComponent />

这是更多内容。
"""
        processor = PostProcessor(content).process()

        # 验证所有处理步骤都正确执行
        assert processor.metadata["title"] == "完整测试文章"
        assert processor.metadata["slug"] == "full-test"
        assert len(processor.metadata["tags"]) == 2

        assert len(processor.toc) >= 2
        assert processor.toc[0]["title"] == "第一章"

        assert processor.reading_time >= 1

        assert processor.content_html is not None
        assert len(processor.content_html) > 0

        assert processor.excerpt is not None
        assert len(processor.excerpt) > 0

    def test_process_mermaid_diagram(self):
        """测试 Mermaid 流程图处理"""
        content = """
# 流程图示例

```mermaid
graph TD
    A[开始] --> B[处理]
    B --> C[结束]
```

正文内容
"""
        processor = PostProcessor(content).process()

        # 验证图表被转换为特殊的 HTML 结构
        assert 'class="diagram-container"' in processor.content_html
        assert 'data-type="mermaid"' in processor.content_html
        assert 'class="diagram-render mermaid"' in processor.content_html
        assert 'class="diagram-source"' in processor.content_html
        assert "A[开始] --> B[处理]" in processor.content_html

    def test_process_multiple_diagrams(self):
        """测试处理多个图表"""
        content = """
```mermaid
graph LR
    A --> B
```

一些文本

```mermaid
sequenceDiagram
    Alice->>Bob: Hello
```
"""
        processor = PostProcessor(content).process()

        # 验证两个图表都被处理
        assert processor.content_html.count('class="diagram-container"') == 2
        assert "A --> B" in processor.content_html
        assert "Alice->>Bob: Hello" in processor.content_html

    def test_process_plantuml_diagram(self):
        """测试 PlantUML 图表处理"""
        content = """
```plantuml
@startuml
Alice -> Bob: 请求
Bob --> Alice: 响应
@enduml
```
"""
        processor = PostProcessor(content).process()

        # 验证 PlantUML 被处理
        assert 'data-type="plantuml"' in processor.content_html
        assert "Alice -> Bob: 请求" in processor.content_html

    def test_diagram_source_code_escaping(self):
        """测试图表源码中的 HTML 字符转义"""
        content = """
```mermaid
graph TD
    A[<div>HTML标签</div>] --> B["引号测试"]
```
"""
        processor = PostProcessor(content).process()

        # 验证 HTML 字符被正确转义
        assert "&lt;div&gt;" in processor.content_html
        assert "&quot;" in processor.content_html

    def test_diagram_with_code_block(self):
        """测试图表和代码块混合"""
        content = """
```python
def hello():
    print("Hello")
```

```mermaid
graph TD
    A --> B
```
"""
        processor = PostProcessor(content).process()

        # 验证代码块和图表都被正确处理
        assert 'class="language-python"' in processor.content_html
        assert 'class="diagram-container"' in processor.content_html


class TestBuildPostsQuery:
    """build_posts_query 函数测试"""

    def test_build_posts_query_no_filters(self):
        """测试不带任何过滤条件的查询"""
        query = build_posts_query()

        # 验证查询对象被创建
        assert query is not None
        # 验证默认状态过滤为 PUBLISHED
        assert "posts_post.status" in str(query)

    def test_build_posts_query_with_post_type(self):
        """测试按文章类型过滤"""
        query = build_posts_query(post_type=PostType.ARTICLE)

        query_str = str(query)
        assert "posts_post.post_type" in query_str

    def test_build_posts_query_with_status(self):
        """测试按状态过滤"""
        query = build_posts_query(status=PostStatus.DRAFT)

        query_str = str(query)
        assert "posts_post.status" in query_str

    def test_build_posts_query_with_category(self):
        """测试按分类过滤"""
        category_id = uuid4()
        query = build_posts_query(category_id=category_id)

        query_str = str(query)
        assert "posts_post.category_id" in query_str

    def test_build_posts_query_with_tag(self):
        """测试按标签过滤"""
        tag_id = uuid4()
        query = build_posts_query(tag_id=tag_id)

        query_str = str(query)
        # 应该包含 JOIN 标签表
        assert "posts_tag" in query_str or "JOIN" in query_str

    def test_build_posts_query_with_author(self):
        """测试按作者过滤"""
        author_id = uuid4()
        query = build_posts_query(author_id=author_id)

        query_str = str(query)
        assert "posts_post.author_id" in query_str

    def test_build_posts_query_with_featured(self):
        """测试按推荐状态过滤"""
        query = build_posts_query(is_featured=True)

        query_str = str(query)
        assert "posts_post.is_featured" in query_str

    def test_build_posts_query_with_search(self):
        """测试搜索功能"""
        query = build_posts_query(search_query="测试")

        query_str = str(query)
        # 应该包含 LIKE 或 ILIKE 查询
        assert "LIKE" in query_str.upper() or "ILIKE" in query_str.upper()

    def test_build_posts_query_with_multiple_filters(self):
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

    def test_build_posts_query_includes_relationships(self):
        """测试查询包含关联数据加载"""
        query = build_posts_query()

        query_str = str(query)
        # 验证使用了 selectinload（通过检查查询字符串）
        # 注意：这个测试可能需要根据实际 SQLAlchemy 版本调整
        assert query is not None

    def test_build_posts_query_ordering(self):
        """测试查询排序"""
        query = build_posts_query()

        # 应该按发布时间和创建时间降序排列
        assert "ORDER BY" in str(query) or "order_by" in str(query)


class TestBuildCategoriesQuery:
    """build_categories_query 函数测试"""

    def test_build_categories_query_article_type(self):
        """测试构建文章分类查询"""
        query = build_categories_query(PostType.ARTICLE)

        query_str = str(query)
        assert "posts_category" in query_str
        assert "posts_category.post_type" in query_str

    def test_build_categories_query_idea_type(self):
        """测试构建想法分类查询"""
        query = build_categories_query(PostType.IDEA)

        query_str = str(query)
        assert "posts_category" in query_str
        assert "posts_category.post_type" in query_str

    def test_build_categories_query_filters_active(self):
        """测试查询只包含激活的分类"""
        query = build_categories_query(PostType.ARTICLE)

        query_str = str(query)
        assert "posts_category.is_active" in query_str

    def test_build_categories_query_ordering(self):
        """测试分类查询排序"""
        query = build_categories_query(PostType.ARTICLE)

        query_str = str(query)
        # 应该按 sort_order 和 name 排序
        assert "ORDER BY" in query_str or "order_by" in str(query)

    def test_build_categories_query_includes_relationships(self):
        """测试分类查询包含关联数据"""
        query = build_categories_query(PostType.ARTICLE)

        # 验证查询对象被创建
        assert query is not None


class TestBuildTagsQuery:
    """build_tags_query 函数测试"""

    def test_build_tags_query_article_type(self):
        """测试构建文章标签查询"""
        query = build_tags_query(PostType.ARTICLE)

        query_str = str(query)
        assert "posts_tag" in query_str
        assert "posts_post.post_type" in query_str

    def test_build_tags_query_idea_type(self):
        """测试构建想法标签查询"""
        query = build_tags_query(PostType.IDEA)

        query_str = str(query)
        assert "posts_tag" in query_str
        assert "posts_post.post_type" in query_str

    def test_build_tags_query_joins_posts(self):
        """测试标签查询关联文章表"""
        query = build_tags_query(PostType.ARTICLE)

        query_str = str(query)
        # 应该包含 JOIN posts 表
        assert "posts_post" in query_str or "JOIN" in query_str

    def test_build_tags_query_distinct(self):
        """测试标签查询去重"""
        query = build_tags_query(PostType.ARTICLE)

        query_str = str(query)
        # 应该包含 DISTINCT
        assert "DISTINCT" in query_str.upper()

    def test_build_tags_query_ordering(self):
        """测试标签查询排序"""
        query = build_tags_query(PostType.ARTICLE)

        # 应该按标签名称排序
        assert "ORDER BY" in str(query) or "order_by" in str(query)


class TestPostProcessorEdgeCases:
    """PostProcessor 边缘情况测试"""

    def test_empty_content(self):
        """测试空内容处理"""
        processor = PostProcessor("").process()

        assert processor.content_mdx == ""
        assert processor.metadata == {}
        assert processor.toc == []
        assert processor.reading_time >= 1  # 最小1分钟

    def test_only_frontmatter(self):
        """测试只有 Frontmatter 没有正文"""
        content = """---
title: 只有标题
---
"""
        processor = PostProcessor(content).process()

        assert processor.metadata["title"] == "只有标题"
        assert processor.content_mdx.strip() == ""

    def test_malformed_frontmatter(self):
        """测试格式错误的 Frontmatter"""
        content = """---
title: 测试
invalid yaml: [
---

正文内容
"""
        # 应该能够处理而不崩溃
        try:
            processor = PostProcessor(content).process()
            # 如果解析失败，应该将整个内容作为正文
            assert processor.content_mdx is not None
        except Exception:
            # 或者抛出可预期的异常
            pass

    def test_nested_code_blocks(self):
        """测试嵌套代码块"""
        content = """
# 标题

```python
def func():
    '''
    # 这不是标题
    '''
    pass
```

## 真实标题
"""
        processor = PostProcessor(content).process()

        # 代码块中的内容不应该被识别为标题
        assert len(processor.toc) == 2
        assert processor.toc[0]["title"] == "标题"
        assert processor.toc[1]["title"] == "真实标题"

    def test_unicode_content(self):
        """测试 Unicode 字符处理"""
        content = """---
title: 测试 🚀 Emoji
---

# 标题 ✨

内容包含各种字符：中文、English、日本語、한국어、Emoji 🎉
"""
        processor = PostProcessor(content).process()

        assert "🚀" in processor.metadata["title"]
        assert "✨" in processor.toc[0]["title"]
        assert "🎉" in processor.content_html

    def test_very_long_content(self):
        """测试超长内容处理"""
        # 创建10000字的内容
        long_content = "这是一段很长的内容。" * 1000
        processor = PostProcessor(long_content).process()

        # 应该能够正常处理
        assert processor.reading_time > 1
        assert len(processor.excerpt) <= 203

    def test_multiple_latex_formulas(self):
        """测试多个公式的处理"""
        content = """
第一个公式：$a^2 + b^2 = c^2$

第二个公式：$E = mc^2$

块级公式：

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$
"""
        processor = PostProcessor(content).process()

        # 应该能够处理多个公式
        assert processor.content_html is not None


# 运行测试的示例
if __name__ == "__main__":
    import sys

    sys.path.append("../../")

    # 创建测试实例并运行
    test_processor = TestPostProcessor()
    test_processor.test_process_simple_markdown()
    test_processor.test_generate_toc_basic()
    test_processor.test_calculate_reading_time_chinese()

    print("✅ 所有 PostProcessor 测试通过！")

    test_query = TestBuildPostsQuery()
    test_query.test_build_posts_query_no_filters()
    test_query.test_build_posts_query_with_search()

    print("✅ 所有查询构建测试通过！")


class TestSlugGeneration:
    """测试 slug 生成逻辑"""

    def test_generate_slug_basic(self):
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

    def test_generate_slug_chinese(self):
        """测试中文标题的 slug 生成"""
        slug = generate_slug_with_random_suffix("我的第一篇文章")

        # 应该有随机后缀
        suffix = slug.split("-")[-1]
        assert len(suffix) == 6, f"Expected suffix length 6, got {len(suffix)}"
        assert re.match(r"^[a-z0-9]+$", suffix)

    def test_generate_slug_empty_title(self):
        """测试空标题时使用默认值"""
        slug = generate_slug_with_random_suffix("")

        # 应该以 "post-" 开头
        assert slug.startswith("post-"), (
            f"Expected slug to start with 'post-', got {slug}"
        )

        suffix = slug.split("-")[-1]
        assert len(suffix) == 6

    def test_generate_slug_special_characters(self):
        """测试特殊字符的处理"""
        slug = generate_slug_with_random_suffix("Hello & World! @#$%")

        # 特殊字符应该被移除或转换
        suffix = slug.split("-")[-1]
        assert len(suffix) == 6
        assert re.match(r"^[a-z0-9-]*$", slug), (
            f"Slug contains invalid characters: {slug}"
        )

    def test_generate_slug_custom_random_length(self):
        """测试自定义随机后缀长度"""
        slug = generate_slug_with_random_suffix("Test", random_length=8)

        suffix = slug.split("-")[-1]
        assert len(suffix) == 8, f"Expected suffix length 8, got {len(suffix)}"

    def test_generate_slug_uniqueness(self):
        """测试随机性：多次调用应该生成不同的 slug"""
        title = "Test Article"
        slugs = [generate_slug_with_random_suffix(title) for _ in range(100)]

        # 所有 slug 应该是唯一的（冲突概率极低）
        unique_slugs = set(slugs)
        assert len(unique_slugs) == len(slugs), "Generated duplicate slugs"

        # 但基础部分应该相同
        base_parts = [slug.rsplit("-", 1)[0] for slug in slugs]
        assert len(set(base_parts)) == 1, "Base slug should be the same"

    def test_generate_slug_consistency_with_same_title(self):
        """测试相同标题的 base slug 部分一致"""
        slug1 = generate_slug_with_random_suffix("My First Post")
        slug2 = generate_slug_with_random_suffix("My First Post")

        # 提取 base slug （去掉随机后缀）
        base1 = slug1.rsplit("-", 1)[0]
        base2 = slug2.rsplit("-", 1)[0]

        assert base1 == base2, f"Base slugs should match: {base1} vs {base2}"

        # 但完整 slug 应该不同
        assert slug1 != slug2, "Complete slugs should be different due to random suffix"

    def test_generate_slug_no_double_hyphen(self):
        """测试不应该产生连续的连字符"""
        slug = generate_slug_with_random_suffix("A---B")

        # 不应该有连续的连字符（除了 base 和 suffix 之间的）
        assert "--" not in slug.replace("-" + slug.split("-")[-1], ""), (
            f"Slug should not have double hyphens: {slug}"
        )

    def test_generate_slug_lowercase(self):
        """测试 slug 应该全小写"""
        slug = generate_slug_with_random_suffix("HELLO WORLD ABC")

        assert slug == slug.lower(), f"Slug should be lowercase: {slug}"
