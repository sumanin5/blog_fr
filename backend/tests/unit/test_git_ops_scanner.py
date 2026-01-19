import pytest
from app.git_ops.components.scanner import MDXScanner, PathParser
from app.posts.model import PostType


@pytest.mark.git_ops
class TestPathParser:
    def test_parse_full_path(self):
        parser = PathParser()
        # content/articles/tech/post.mdx
        result = parser.parse("articles/tech/post.mdx")
        assert result["post_type"] == PostType.ARTICLE
        assert result["category_slug"] == "tech"

    def test_parse_short_path(self):
        parser = PathParser()
        # content/articles/post.mdx
        result = parser.parse("articles/post.mdx")
        assert result["post_type"] == PostType.ARTICLE
        assert result["category_slug"] is None

    def test_parse_plural_types(self):
        parser = PathParser()
        # content/ideas/foo.mdx
        result = parser.parse("ideas/foo.mdx")
        assert result["post_type"] == PostType.IDEA

        # content/til/foo.mdx
        # result = parser.parse("tils/foo.mdx")
        # assert result["post_type"] == PostType.TIL


@pytest.mark.git_ops
@pytest.mark.asyncio
class TestMDXScanner:
    async def test_scan_file(self, tmp_path):
        # Setup
        content_root = tmp_path / "content"
        content_root.mkdir()

        file_path = content_root / "articles" / "python" / "test.mdx"
        file_path.parent.mkdir(parents=True)

        content = """---
title: Test Post
slug: test-post
---
Hello World
"""
        file_path.write_text(content, encoding="utf-8")

        # Execute
        scanner = MDXScanner(content_root)
        scanned = await scanner.scan_file("articles/python/test.mdx")

        # Verify
        assert scanned is not None
        assert scanned.file_path == "articles/python/test.mdx"
        assert scanned.frontmatter["title"] == "Test Post"
        assert scanned.content.strip() == "Hello World"
        assert scanned.derived_post_type == PostType.ARTICLE
        assert scanned.derived_category_slug == "python"
        assert scanned.content_hash is not None
        assert scanned.meta_hash is not None

    async def test_scan_nonexistent_file(self, tmp_path):
        scanner = MDXScanner(tmp_path)
        result = await scanner.scan_file("nonexistent.mdx")
        assert result is None

    async def test_scan_all(self, tmp_path):
        # Setup multiple files
        content_root = tmp_path / "content"
        content_root.mkdir()
        (content_root / "articles").mkdir()
        (content_root / "ideas").mkdir()

        (content_root / "articles" / "a.mdx").write_text(
            "---\ntitle: A\n---\nA", encoding="utf-8"
        )
        (content_root / "ideas" / "b.md").write_text(
            "---\ntitle: B\n---\nB", encoding="utf-8"
        )
        (content_root / "ignore.txt").write_text("ignore", encoding="utf-8")

        # Execute
        scanner = MDXScanner(content_root)
        results = await scanner.scan_all()

        # Verify
        assert len(results) == 2
        paths = sorted([r.file_path for r in results])
        assert paths == ["articles/a.mdx", "ideas/b.md"]
