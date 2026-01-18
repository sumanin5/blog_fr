"""
测试文章封面功能
"""

from datetime import datetime
from uuid import uuid4

from app.core.config import settings
from app.posts.schema import PostDetailResponse, PostShortResponse


class TestPostCoverUrls:
    """测试文章封面 URL 生成"""

    def test_post_short_response_with_cover(self):
        """测试列表响应包含缩略图 URL"""
        cover_id = uuid4()

        response = PostShortResponse(
            id=uuid4(),
            title="测试文章",
            slug="test-post",
            excerpt="摘要",
            reading_time=5,
            view_count=0,
            like_count=0,
            comment_count=0,
            author_id=uuid4(),
            cover_media_id=cover_id,
            created_at=datetime(2024, 1, 1, 0, 0, 0),
            updated_at=datetime(2024, 1, 1, 0, 0, 0),
        )

        # 验证缩略图 URL（medium 尺寸）
        assert (
            response.cover_thumbnail
            == f"{settings.API_PREFIX}/media/{cover_id}/thumbnail/medium"
        )

    def test_post_short_response_without_cover(self):
        """测试列表响应无封面时返回 None"""
        response = PostShortResponse(
            id=uuid4(),
            title="测试文章",
            slug="test-post",
            excerpt="摘要",
            reading_time=5,
            view_count=0,
            like_count=0,
            comment_count=0,
            author_id=uuid4(),
            cover_media_id=None,  # 无封面
            created_at=datetime(2024, 1, 1, 0, 0, 0),
            updated_at=datetime(2024, 1, 1, 0, 0, 0),
        )

        assert response.cover_thumbnail is None

    def test_post_detail_response_with_cover(self):
        """测试详情响应包含大图 URL"""
        cover_id = uuid4()

        response = PostDetailResponse(
            id=uuid4(),
            title="测试文章",
            slug="test-post",
            excerpt="摘要",
            content_mdx="# 内容",
            content_ast={"type": "root", "children": []},
            toc=[],
            reading_time=5,
            view_count=0,
            like_count=0,
            comment_count=0,
            author_id=uuid4(),
            cover_media_id=cover_id,
            created_at=datetime(2024, 1, 1, 0, 0, 0),
            updated_at=datetime(2024, 1, 1, 0, 0, 0),
        )

        # 验证封面图 URL（xlarge 尺寸）
        assert (
            response.cover_image
            == f"{settings.API_PREFIX}/media/{cover_id}/thumbnail/xlarge"
        )

        # 继承的缩略图 URL 也应该存在
        assert (
            response.cover_thumbnail
            == f"{settings.API_PREFIX}/media/{cover_id}/thumbnail/medium"
        )

    def test_post_detail_response_without_cover(self):
        """测试详情响应无封面时返回 None"""
        response = PostDetailResponse(
            id=uuid4(),
            title="测试文章",
            slug="test-post",
            excerpt="摘要",
            content_mdx="# 内容",
            content_ast={"type": "root", "children": []},
            toc=[],
            reading_time=5,
            view_count=0,
            like_count=0,
            comment_count=0,
            author_id=uuid4(),
            cover_media_id=None,
            created_at=datetime(2024, 1, 1, 0, 0, 0),
            updated_at=datetime(2024, 1, 1, 0, 0, 0),
        )

        assert response.cover_image is None
        assert response.cover_thumbnail is None
