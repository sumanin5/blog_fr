"""
单元测试：ContentProcessor 图片路径转换功能

测试场景：
1. 检测相对路径图片
2. 跳过外部链接图片
3. 跳过已转换的媒体库链接
4. 转换相对路径图片为完整 URL
5. 写回源文件
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from app.git_ops.components.processors.content import ContentProcessor
from app.git_ops.components.scanner import ScannedPost


@pytest.fixture
def content_processor():
    """创建 ContentProcessor 实例"""
    return ContentProcessor()


@pytest.fixture
def mock_session():
    """Mock 数据库 session"""
    session = AsyncMock()
    return session


@pytest.fixture
def mock_scanned_post():
    """Mock ScannedPost 对象"""
    post = Mock(spec=ScannedPost)
    post.file_path = "articles/test/test-post.md"
    post.frontmatter = {"title": "Test Post"}
    return post


class TestImageDetection:
    """测试图片检测功能"""

    def test_has_relative_images_with_dot_slash(self, content_processor):
        """测试检测 ./ 开头的相对路径"""
        content = "# Test\n\n![image](./test.png)\n\nSome text"
        assert content_processor._has_relative_images(content) is True

    def test_has_relative_images_with_dot_dot_slash(self, content_processor):
        """测试检测 ../ 开头的相对路径"""
        content = "# Test\n\n![image](../images/test.png)\n\nSome text"
        assert content_processor._has_relative_images(content) is True

    def test_has_relative_images_with_relative_path(self, content_processor):
        """测试检测无前缀的相对路径"""
        content = "# Test\n\n![image](images/test.png)\n\nSome text"
        assert content_processor._has_relative_images(content) is True

    def test_no_relative_images_with_http(self, content_processor):
        """测试跳过 HTTP 外部链接"""
        content = "# Test\n\n![image](http://example.com/test.png)\n\nSome text"
        assert content_processor._has_relative_images(content) is False

    def test_no_relative_images_with_https(self, content_processor):
        """测试跳过 HTTPS 外部链接"""
        content = "# Test\n\n![image](https://example.com/test.png)\n\nSome text"
        assert content_processor._has_relative_images(content) is False

    def test_no_relative_images_with_media_url(self, content_processor):
        """测试跳过已转换的媒体库链接"""
        content = "# Test\n\n![image](http://localhost:8000/api/v1/media/123/thumbnail/large)\n\nSome text"
        assert content_processor._has_relative_images(content) is False

    def test_no_relative_images_without_images(self, content_processor):
        """测试无图片的内容"""
        content = "# Test\n\nJust some text without images"
        assert content_processor._has_relative_images(content) is False

    def test_mixed_images(self, content_processor):
        """测试混合图片（有相对路径就返回 True）"""
        content = """
# Test

![external](https://example.com/test.png)
![relative](./local.png)
![media](http://localhost:8000/api/v1/media/123/thumbnail/large)
"""
        assert content_processor._has_relative_images(content) is True


class TestShouldProcessImage:
    """测试图片处理判断逻辑"""

    def test_should_process_dot_slash(self, content_processor):
        """应该处理 ./ 路径"""
        assert content_processor._should_process_image("./test.png") is True

    def test_should_process_dot_dot_slash(self, content_processor):
        """应该处理 ../ 路径"""
        assert content_processor._should_process_image("../test.png") is True

    def test_should_process_relative(self, content_processor):
        """应该处理相对路径"""
        assert content_processor._should_process_image("images/test.png") is True

    def test_should_not_process_http(self, content_processor):
        """不应该处理 HTTP 链接"""
        assert (
            content_processor._should_process_image("http://example.com/test.png")
            is False
        )

    def test_should_not_process_https(self, content_processor):
        """不应该处理 HTTPS 链接"""
        assert (
            content_processor._should_process_image("https://example.com/test.png")
            is False
        )

    def test_should_not_process_media_api(self, content_processor):
        """不应该处理媒体库 API 链接"""
        assert (
            content_processor._should_process_image("/api/v1/media/123/thumbnail/large")
            is False
        )

    def test_should_not_process_media_path(self, content_processor):
        """不应该处理媒体库路径"""
        assert (
            content_processor._should_process_image("/media/uploads/test.png") is False
        )

    def test_should_not_process_absolute_path(self, content_processor):
        """不应该处理绝对路径"""
        assert (
            content_processor._should_process_image("/absolute/path/test.png") is False
        )


class TestImageTransformation:
    """测试图片路径转换功能"""

    @pytest.mark.asyncio
    async def test_transform_single_relative_image(
        self, content_processor, mock_session
    ):
        """测试转换单个相对路径图片"""
        content = "# Test\n\n![test image](./test.png)\n\nSome text"
        file_path = "articles/test/post.md"

        # Mock media_id
        test_media_id = "019c13b8-e19c-7760-94d8-a5e265dee16b"

        with patch.object(
            content_processor, "_upload_and_get_media_id", return_value=test_media_id
        ):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.BASE_URL = "http://localhost:8000"
                mock_settings.API_PREFIX = "/api/v1"

                result = await content_processor._transform_image_paths(
                    content, file_path, mock_session
                )

        expected_url = (
            f"http://localhost:8000/api/v1/media/{test_media_id}/thumbnail/large"
        )
        assert f"![test image]({expected_url})" in result
        assert "./test.png" not in result

    @pytest.mark.asyncio
    async def test_transform_multiple_images(self, content_processor, mock_session):
        """测试转换多个图片"""
        content = """
# Test

![image1](./test1.png)
![image2](./test2.png)
![image3](./test3.png)
"""
        file_path = "articles/test/post.md"

        # Mock 返回不同的 media_id
        media_ids = [
            "019c13b8-e19c-7760-94d8-a5e265dee16b",
            "019c13b8-e19c-7760-94d8-a5e265dee16c",
            "019c13b8-e19c-7760-94d8-a5e265dee16d",
        ]

        call_count = 0

        async def mock_upload(path, file_path, session):
            nonlocal call_count
            result = media_ids[call_count]
            call_count += 1
            return result

        with patch.object(
            content_processor, "_upload_and_get_media_id", side_effect=mock_upload
        ):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.BASE_URL = "http://localhost:8000"
                mock_settings.API_PREFIX = "/api/v1"

                result = await content_processor._transform_image_paths(
                    content, file_path, mock_session
                )

        # 验证所有图片都被转换
        for media_id in media_ids:
            expected_url = (
                f"http://localhost:8000/api/v1/media/{media_id}/thumbnail/large"
            )
            assert expected_url in result

        # 验证相对路径都被替换
        assert "./test1.png" not in result
        assert "./test2.png" not in result
        assert "./test3.png" not in result

    @pytest.mark.asyncio
    async def test_preserve_external_urls(self, content_processor, mock_session):
        """测试保留外部链接"""
        content = """
# Test

![external](https://example.com/test.png)
![relative](./local.png)
"""
        file_path = "articles/test/post.md"
        test_media_id = "019c13b8-e19c-7760-94d8-a5e265dee16b"

        with patch.object(
            content_processor, "_upload_and_get_media_id", return_value=test_media_id
        ):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.BASE_URL = "http://localhost:8000"
                mock_settings.API_PREFIX = "/api/v1"

                result = await content_processor._transform_image_paths(
                    content, file_path, mock_session
                )

        # 外部链接应该保持不变
        assert "https://example.com/test.png" in result
        # 相对路径应该被转换
        assert "./local.png" not in result
        assert test_media_id in result

    @pytest.mark.asyncio
    async def test_preserve_media_urls(self, content_processor, mock_session):
        """测试保留已转换的媒体库链接"""
        existing_url = "http://localhost:8000/api/v1/media/existing-id/thumbnail/large"
        content = f"""
# Test

![already converted]({existing_url})
![relative](./local.png)
"""
        file_path = "articles/test/post.md"
        test_media_id = "019c13b8-e19c-7760-94d8-a5e265dee16b"

        with patch.object(
            content_processor, "_upload_and_get_media_id", return_value=test_media_id
        ):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.BASE_URL = "http://localhost:8000"
                mock_settings.API_PREFIX = "/api/v1"

                result = await content_processor._transform_image_paths(
                    content, file_path, mock_session
                )

        # 已转换的链接应该保持不变
        assert existing_url in result
        # 相对路径应该被转换
        assert "./local.png" not in result

    @pytest.mark.asyncio
    async def test_handle_upload_failure(self, content_processor, mock_session):
        """测试处理上传失败的情况"""
        content = "# Test\n\n![test](./test.png)\n\nSome text"
        file_path = "articles/test/post.md"

        # Mock 上传失败（返回 None）
        with patch.object(
            content_processor, "_upload_and_get_media_id", return_value=None
        ):
            result = await content_processor._transform_image_paths(
                content, file_path, mock_session
            )

        # 上传失败时应该保持原样
        assert "./test.png" in result


class TestProcessMethod:
    """测试 process 方法的完整流程"""

    @pytest.mark.asyncio
    async def test_process_without_images(
        self, content_processor, mock_session, mock_scanned_post
    ):
        """测试处理无图片的内容"""
        content = "# Test\n\nJust some text"
        mock_scanned_post.content = content

        result = {}

        with patch.object(
            content_processor, "_write_transformed_content"
        ) as mock_write:
            await content_processor.process(
                result, {}, mock_scanned_post, mock_session, dry_run=False
            )

            # 无图片时不应该调用写回
            mock_write.assert_not_called()

        # 内容应该保持不变
        assert result["content_mdx"] == content

    @pytest.mark.asyncio
    async def test_process_with_relative_images(
        self, content_processor, mock_session, mock_scanned_post
    ):
        """测试处理有相对路径图片的内容"""
        original_content = "# Test\n\n![test](./test.png)\n\nSome text"
        mock_scanned_post.content = original_content

        test_media_id = "019c13b8-e19c-7760-94d8-a5e265dee16b"
        transformed_content = f"# Test\n\n![test](http://localhost:8000/api/v1/media/{test_media_id}/thumbnail/large)\n\nSome text"

        result = {}

        with patch.object(
            content_processor,
            "_transform_image_paths",
            return_value=transformed_content,
        ) as mock_transform:
            with patch.object(
                content_processor, "_write_transformed_content"
            ) as mock_write:
                await content_processor.process(
                    result, {}, mock_scanned_post, mock_session, dry_run=False
                )

                # 应该调用转换
                mock_transform.assert_called_once()

                # 应该调用写回
                mock_write.assert_called_once_with(
                    mock_scanned_post.file_path, transformed_content
                )

        # 结果应该是转换后的内容
        assert result["content_mdx"] == transformed_content

    @pytest.mark.asyncio
    async def test_process_with_external_images(
        self, content_processor, mock_session, mock_scanned_post
    ):
        """测试处理只有外部链接图片的内容"""
        content = "# Test\n\n![test](https://example.com/test.png)\n\nSome text"
        mock_scanned_post.content = content

        result = {}

        with patch.object(
            content_processor, "_write_transformed_content"
        ) as mock_write:
            await content_processor.process(
                result, {}, mock_scanned_post, mock_session, dry_run=False
            )

            # 只有外部链接时不应该调用写回
            mock_write.assert_not_called()

        # 内容应该保持不变
        assert result["content_mdx"] == content

    @pytest.mark.asyncio
    async def test_process_dry_run_mode(
        self, content_processor, mock_session, mock_scanned_post
    ):
        """测试 dry_run 模式不执行转换"""
        content = "# Test\n\n![test](./test.png)\n\nSome text"
        mock_scanned_post.content = content

        result = {}

        with patch.object(
            content_processor, "_transform_image_paths"
        ) as mock_transform:
            with patch.object(
                content_processor, "_write_transformed_content"
            ) as mock_write:
                await content_processor.process(
                    result, {}, mock_scanned_post, mock_session, dry_run=True
                )

                # dry_run 模式不应该调用转换和写回
                mock_transform.assert_not_called()
                mock_write.assert_not_called()

        # 内容应该保持原样
        assert result["content_mdx"] == content

    @pytest.mark.asyncio
    async def test_process_title_fallback(
        self, content_processor, mock_session, mock_scanned_post
    ):
        """测试 title fallback 功能"""
        content = "# Test\n\nSome text"
        mock_scanned_post.content = content
        mock_scanned_post.file_path = "articles/test/my-awesome-post.md"

        result = {}  # 没有 title

        await content_processor.process(
            result, {}, mock_scanned_post, mock_session, dry_run=False
        )

        # 应该使用文件名作为 title
        assert result["title"] == "my-awesome-post"


class TestWriteTransformedContent:
    """测试写回转换后的内容"""

    @pytest.mark.asyncio
    async def test_write_transformed_content_success(self, content_processor):
        """测试成功写回内容"""
        file_path = "articles/test/post.md"
        new_content = (
            "# Test\n\n![test](http://localhost:8000/api/v1/media/123/thumbnail/large)"
        )

        mock_post = Mock()
        mock_post.content = "old content"
        mock_post.metadata = {"title": "Test"}

        with patch("app.core.config.settings") as mock_settings:
            mock_settings.CONTENT_DIR = "/tmp/content"

            # Mock frontmatter at the import location
            with patch("builtins.open", create=True):
                with patch("asyncio.to_thread") as mock_thread:
                    # Mock the read operation
                    def mock_read_fn():
                        return mock_post

                    # Mock the write operation
                    def mock_write_fn():
                        pass

                    # First call is read, second is write
                    mock_thread.side_effect = [mock_read_fn(), mock_write_fn()]

                    # This test just verifies no exception is raised
                    await content_processor._write_transformed_content(
                        file_path, new_content
                    )

    @pytest.mark.asyncio
    async def test_write_transformed_content_failure(self, content_processor):
        """测试写回失败不抛出异常"""
        file_path = "articles/test/post.md"
        new_content = (
            "# Test\n\n![test](http://localhost:8000/api/v1/media/123/thumbnail/large)"
        )

        with patch("app.core.config.settings") as mock_settings:
            mock_settings.CONTENT_DIR = "/tmp/content"

            with patch("builtins.open", side_effect=IOError("File not found")):
                with patch("asyncio.to_thread", side_effect=lambda f: f()):
                    # 不应该抛出异常
                    await content_processor._write_transformed_content(
                        file_path, new_content
                    )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
