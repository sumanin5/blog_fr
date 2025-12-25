"""
缩略图生成集成测试

测试真实的文件操作和缩略图生成功能
"""

from pathlib import Path
from uuid import uuid4

import pytest
from app.media.utils import (
    THUMBNAIL_SIZES,
    cleanup_all_thumbnails,
    generate_all_thumbnails_for_file,
    get_thumbnail_size,
    save_file_to_disk,
    should_generate_thumbnails,
)


@pytest.mark.asyncio
@pytest.mark.media
class TestThumbnailGeneration:
    """缩略图生成测试"""

    async def test_generate_thumbnails_for_png_image(
        self, temp_media_dir: Path, sample_image_data: bytes
    ):
        """测试为PNG图片生成缩略图"""
        user_id = uuid4()
        original_filename = "test_image.png"

        # 保存原始图片
        source_path = temp_media_dir / "uploads" / "2025" / "01" / "test_image.png"
        await save_file_to_disk(sample_image_data, str(source_path))

        # 生成缩略图
        thumbnails = await generate_all_thumbnails_for_file(
            str(source_path), user_id, original_filename
        )

        # 验证生成了所有尺寸的缩略图
        assert len(thumbnails) == len(THUMBNAIL_SIZES)

        for size_name in THUMBNAIL_SIZES.keys():
            assert size_name in thumbnails, f"缺少 {size_name} 尺寸的缩略图"

            # 验证缩略图文件存在
            thumbnail_path = temp_media_dir / thumbnails[size_name]
            assert thumbnail_path.exists(), f"缩略图文件不存在: {thumbnail_path}"
            assert thumbnail_path.suffix == ".webp", (
                f"缩略图格式不正确: {thumbnail_path}"
            )

    async def test_generate_thumbnails_for_jpeg_image(
        self, temp_media_dir: Path, sample_jpeg_data: bytes
    ):
        """测试为JPEG图片生成缩略图"""
        user_id = uuid4()
        original_filename = "test_photo.jpg"

        # 保存原始图片
        source_path = temp_media_dir / "uploads" / "2025" / "01" / "test_photo.jpg"
        await save_file_to_disk(sample_jpeg_data, str(source_path))

        # 生成缩略图
        thumbnails = await generate_all_thumbnails_for_file(
            str(source_path), user_id, original_filename
        )

        # 验证缩略图数量和格式
        assert len(thumbnails) == 4  # small, medium, large, xlarge

        for size_name, thumbnail_path in thumbnails.items():
            full_path = temp_media_dir / thumbnail_path
            assert full_path.exists()

            # 验证文件名包含尺寸标识
            assert size_name in full_path.name
            assert full_path.name.endswith(".webp")

    async def test_generate_thumbnails_for_large_image(
        self, temp_media_dir: Path, large_image_data: bytes
    ):
        """测试为大尺寸图片生成缩略图（测试缩小效果）"""
        user_id = uuid4()
        original_filename = "large_photo.jpg"

        # 保存原始大图片
        source_path = temp_media_dir / "uploads" / "2025" / "01" / "large_photo.jpg"
        await save_file_to_disk(large_image_data, str(source_path))

        # 生成缩略图
        thumbnails = await generate_all_thumbnails_for_file(
            str(source_path), user_id, original_filename
        )

        # 验证所有缩略图都生成了
        assert len(thumbnails) == 4

        # 验证缩略图尺寸正确
        from PIL import Image

        for size_name, thumbnail_path in thumbnails.items():
            full_path = temp_media_dir / thumbnail_path
            expected_size = get_thumbnail_size(size_name)

            with Image.open(full_path) as img:
                assert img.size == expected_size, (
                    f"{size_name} 缩略图尺寸不正确: 期望 {expected_size}, 实际 {img.size}"
                )

    async def test_generate_thumbnails_for_small_image(
        self, temp_media_dir: Path, small_image_data: bytes
    ):
        """测试为小尺寸图片生成缩略图（测试放大效果）"""
        user_id = uuid4()
        original_filename = "small_icon.png"

        # 保存原始小图片
        source_path = temp_media_dir / "uploads" / "2025" / "01" / "small_icon.png"
        await save_file_to_disk(small_image_data, str(source_path))

        # 生成缩略图
        thumbnails = await generate_all_thumbnails_for_file(
            str(source_path), user_id, original_filename
        )

        # 验证缩略图生成
        assert len(thumbnails) == 4

        # 验证xlarge缩略图被放大了
        xlarge_path = temp_media_dir / thumbnails["xlarge"]
        from PIL import Image

        with Image.open(xlarge_path) as img:
            assert img.size == (1200, 1200), f"xlarge缩略图尺寸不正确: {img.size}"

    async def test_svg_image_no_thumbnails(self, temp_media_dir: Path):
        """测试SVG图片不生成缩略图"""
        # 验证SVG文件不应该生成缩略图的逻辑
        svg_path = "icon.svg"
        should_generate = should_generate_thumbnails(svg_path, "image")
        assert not should_generate, "SVG文件不应该生成缩略图"

        # 测试大小写不敏感
        svg_path_upper = "LOGO.SVG"
        should_generate_upper = should_generate_thumbnails(svg_path_upper, "image")
        assert not should_generate_upper, "大写SVG文件也不应该生成缩略图"

    async def test_nonexistent_source_file(self, temp_media_dir: Path):
        """测试源文件不存在的情况"""
        user_id = uuid4()
        nonexistent_path = str(temp_media_dir / "nonexistent.jpg")

        # 尝试为不存在的文件生成缩略图
        thumbnails = await generate_all_thumbnails_for_file(
            nonexistent_path, user_id, "nonexistent.jpg"
        )

        # 应该返回空字典
        assert len(thumbnails) == 0, "不存在的文件不应该生成缩略图"

    async def test_thumbnail_cleanup(
        self, temp_media_dir: Path, sample_image_data: bytes
    ):
        """测试缩略图清理功能"""
        user_id = uuid4()
        original_filename = "cleanup_test.png"

        # 保存原始图片并生成缩略图
        source_path = temp_media_dir / "uploads" / "2025" / "01" / "cleanup_test.png"
        await save_file_to_disk(sample_image_data, str(source_path))

        thumbnails = await generate_all_thumbnails_for_file(
            str(source_path), user_id, original_filename
        )

        # 验证缩略图存在
        assert len(thumbnails) > 0
        for thumbnail_path in thumbnails.values():
            full_path = temp_media_dir / thumbnail_path
            assert full_path.exists(), f"缩略图应该存在: {full_path}"

        # 清理缩略图
        await cleanup_all_thumbnails(thumbnails, str(temp_media_dir))

        # 验证缩略图已被删除
        for thumbnail_path in thumbnails.values():
            full_path = temp_media_dir / thumbnail_path
            assert not full_path.exists(), f"缩略图应该已被删除: {full_path}"

    async def test_thumbnail_path_structure(
        self, temp_media_dir: Path, sample_image_data: bytes
    ):
        """测试缩略图路径结构"""
        user_id = uuid4()
        original_filename = "path_test.png"

        # 保存原始图片
        source_path = temp_media_dir / "uploads" / "2025" / "01" / "path_test.png"
        await save_file_to_disk(sample_image_data, str(source_path))

        # 生成缩略图
        thumbnails = await generate_all_thumbnails_for_file(
            str(source_path), user_id, original_filename
        )

        # 验证缩略图路径结构
        for size_name, thumbnail_path in thumbnails.items():
            # 路径应该以 thumbnails/ 开头
            assert thumbnail_path.startswith("thumbnails/"), (
                f"缩略图路径格式不正确: {thumbnail_path}"
            )

            # 路径应该包含年月结构
            path_parts = Path(thumbnail_path).parts
            assert len(path_parts) >= 4, f"缩略图路径层级不够: {path_parts}"
            assert path_parts[0] == "thumbnails"
            assert path_parts[1].isdigit()  # 年份
            assert path_parts[2].isdigit()  # 月份

            # 文件名应该包含尺寸标识
            filename = path_parts[-1]
            assert filename.startswith(f"{size_name}_"), (
                f"缩略图文件名格式不正确: {filename}"
            )

    async def test_concurrent_thumbnail_generation(
        self, temp_media_dir: Path, sample_image_data: bytes, sample_jpeg_data: bytes
    ):
        """测试并发生成缩略图"""
        import asyncio

        user_id = uuid4()

        # 准备多个图片文件
        files = [
            ("image1.png", sample_image_data),
            ("image2.jpg", sample_jpeg_data),
        ]

        # 保存原始图片
        source_paths = []
        for filename, data in files:
            source_path = temp_media_dir / "uploads" / "2025" / "01" / filename
            await save_file_to_disk(data, str(source_path))
            source_paths.append((str(source_path), filename))

        # 并发生成缩略图
        tasks = [
            generate_all_thumbnails_for_file(source_path, user_id, filename)
            for source_path, filename in source_paths
        ]

        results = await asyncio.gather(*tasks)

        # 验证所有缩略图都生成成功
        for thumbnails in results:
            assert len(thumbnails) == 4, "每个图片都应该生成4个缩略图"

            for thumbnail_path in thumbnails.values():
                full_path = temp_media_dir / thumbnail_path
                assert full_path.exists(), f"并发生成的缩略图应该存在: {full_path}"


@pytest.mark.asyncio
@pytest.mark.media
class TestThumbnailSizes:
    """缩略图尺寸测试"""

    async def test_all_thumbnail_sizes_generated(
        self, temp_media_dir: Path, large_image_data: bytes
    ):
        """测试所有预定义尺寸的缩略图都被生成"""
        user_id = uuid4()
        original_filename = "size_test.jpg"

        # 保存原始图片
        source_path = temp_media_dir / "uploads" / "2025" / "01" / "size_test.jpg"
        await save_file_to_disk(large_image_data, str(source_path))

        # 生成缩略图
        thumbnails = await generate_all_thumbnails_for_file(
            str(source_path), user_id, original_filename
        )

        # 验证每个预定义尺寸都有对应的缩略图
        expected_sizes = ["small", "medium", "large", "xlarge"]
        assert set(thumbnails.keys()) == set(expected_sizes), (
            f"缩略图尺寸不完整: 期望 {expected_sizes}, 实际 {list(thumbnails.keys())}"
        )

        # 验证每个缩略图的实际尺寸
        from PIL import Image

        for size_name in expected_sizes:
            thumbnail_path = temp_media_dir / thumbnails[size_name]
            expected_size = get_thumbnail_size(size_name)

            with Image.open(thumbnail_path) as img:
                assert img.size == expected_size, (
                    f"{size_name} 缩略图尺寸错误: 期望 {expected_size}, 实际 {img.size}"
                )

    async def test_thumbnail_quality_and_format(
        self, temp_media_dir: Path, sample_image_data: bytes
    ):
        """测试缩略图质量和格式"""
        user_id = uuid4()
        original_filename = "quality_test.png"

        # 保存原始图片
        source_path = temp_media_dir / "uploads" / "2025" / "01" / "quality_test.png"
        await save_file_to_disk(sample_image_data, str(source_path))

        # 生成缩略图
        thumbnails = await generate_all_thumbnails_for_file(
            str(source_path), user_id, original_filename
        )

        # 验证缩略图格式和质量
        from PIL import Image

        for size_name, thumbnail_path in thumbnails.items():
            full_path = temp_media_dir / thumbnail_path

            with Image.open(full_path) as img:
                # 验证格式为WebP
                assert img.format == "WEBP", f"缩略图格式不正确: {img.format}"

                # 验证图片模式（应该是RGB）
                assert img.mode == "RGB", f"缩略图颜色模式不正确: {img.mode}"

                # 验证文件大小合理（WebP应该比较小）
                file_size = full_path.stat().st_size
                assert file_size > 0, "缩略图文件大小不能为0"
                assert file_size < len(sample_image_data), "缩略图应该比原图小"


# 运行示例
if __name__ == "__main__":
    print("✅ 缩略图生成集成测试已创建！")
    print("运行测试：pytest backend/tests/api/media/test_thumbnail_generation.py -v")
