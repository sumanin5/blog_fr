"""
媒体文件工具函数单元测试

测试 app.media.utils 模块中的路径生成和文件处理函数
"""

import re
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from app.media.utils import (
    detect_media_type_from_filename,
    detect_media_type_from_mime,
    generate_thumbnail_path,
    generate_upload_path,
    get_file_extension,
    get_mime_type,
    get_thumbnail_size,
    should_generate_thumbnails,
    smart_crop_and_resize,
    validate_file_extension,
    validate_file_size,
)


class TestPathGeneration:
    """路径生成函数测试"""

    def test_generate_upload_path_format(self):
        """测试上传路径格式是否正确"""
        # 准备测试数据
        user_id = uuid4()
        filename = "test_photo.jpg"

        # 生成路径
        path = generate_upload_path(user_id, filename)

        # 验证路径格式：uploads/年份/月份/日期_时分秒_UUID前15位.扩展名
        # 例如：uploads/2025/01/15_143022_123e4567e89b12d.jpg
        pattern = r"^uploads/\d{4}/\d{2}/\d{2}_\d{6}_[a-f0-9]{15}\.jpg$"

        assert re.match(pattern, path), f"路径格式不正确: {path}"

        # 验证路径组成部分
        parts = Path(path).parts
        assert len(parts) == 4, f"路径层级不正确: {parts}"
        assert parts[0] == "uploads", f"基础目录不正确: {parts[0]}"

        # 验证年份格式（4位数字）
        year = parts[1]
        assert len(year) == 4 and year.isdigit(), f"年份格式不正确: {year}"

        # 验证月份格式（2位数字，01-12）
        month = parts[2]
        assert len(month) == 2 and month.isdigit(), f"月份格式不正确: {month}"
        assert 1 <= int(month) <= 12, f"月份范围不正确: {month}"

        # 验证文件名格式
        filename_part = parts[3]
        filename_pattern = r"^\d{2}_\d{6}_[a-f0-9]{15}\.jpg$"
        assert re.match(filename_pattern, filename_part), (
            f"文件名格式不正确: {filename_part}"
        )

    def test_generate_upload_path_with_different_extensions(self):
        """测试不同文件扩展名的路径生成"""
        user_id = uuid4()
        test_cases = [
            ("photo.jpg", "jpg"),
            ("document.pdf", "pdf"),
            ("image.PNG", "png"),  # 测试大写扩展名
            ("video.mp4", "mp4"),
            ("file.txt", "txt"),
            ("no_extension", "bin"),  # 无扩展名的情况
        ]

        for original_filename, expected_ext in test_cases:
            path = generate_upload_path(user_id, original_filename)

            # 验证扩展名正确
            actual_ext = Path(path).suffix[1:]  # 去掉点号
            assert actual_ext == expected_ext, (
                f"扩展名不正确: 期望 {expected_ext}, 实际 {actual_ext}"
            )

    def test_generate_upload_path_custom_base_dir(self):
        """测试自定义基础目录"""
        user_id = uuid4()
        filename = "test.jpg"
        custom_base = "custom_uploads"

        path = generate_upload_path(user_id, filename, custom_base)

        # 验证使用了自定义基础目录
        assert path.startswith(custom_base), f"未使用自定义基础目录: {path}"

    def test_generate_upload_path_uniqueness(self):
        """测试路径唯一性"""
        user_id = uuid4()
        filename = "test.jpg"

        # 生成多个路径
        paths = [generate_upload_path(user_id, filename) for _ in range(10)]

        # 验证所有路径都不相同（UUID保证唯一性）
        assert len(set(paths)) == len(paths), "生成的路径不唯一"

    def test_generate_upload_path_time_consistency(self):
        """测试路径中的时间信息一致性"""
        user_id = uuid4()
        filename = "test.jpg"

        # 记录当前时间
        before_time = datetime.now()
        path = generate_upload_path(user_id, filename)
        after_time = datetime.now()

        # 提取路径中的时间信息
        parts = Path(path).parts
        year = int(parts[1])
        month = int(parts[2])

        # 验证年月与当前时间一致
        assert before_time.year <= year <= after_time.year
        assert before_time.month <= month <= after_time.month


class TestThumbnailPathGeneration:
    """缩略图路径生成测试"""

    def test_generate_thumbnail_path_format(self):
        """测试缩略图路径格式"""
        user_id = uuid4()
        size = "medium"
        original_path = "uploads/2025/01/15_143022_123e4567e89b12d.jpg"

        thumbnail_path = generate_thumbnail_path(user_id, size, original_path)

        # 验证缩略图路径格式：thumbnails/年份/月份/尺寸_原文件名.webp
        expected_pattern = (
            r"^thumbnails/\d{4}/\d{2}/medium_\d{2}_\d{6}_[a-f0-9]{15}\.webp$"
        )
        assert re.match(expected_pattern, thumbnail_path), (
            f"缩略图路径格式不正确: {thumbnail_path}"
        )

    def test_generate_thumbnail_path_different_sizes(self):
        """测试不同尺寸的缩略图路径"""
        user_id = uuid4()
        original_path = "uploads/2025/01/15_143022_123e4567e89b12d.jpg"
        sizes = ["small", "medium", "large", "xlarge"]

        for size in sizes:
            thumbnail_path = generate_thumbnail_path(user_id, size, original_path)

            # 验证路径包含正确的尺寸标识
            filename = Path(thumbnail_path).name
            assert filename.startswith(f"{size}_"), (
                f"缩略图文件名不包含尺寸标识: {filename}"
            )

            # 验证扩展名为 webp
            assert thumbnail_path.endswith(".webp"), (
                f"缩略图扩展名不正确: {thumbnail_path}"
            )

    def test_generate_thumbnail_path_preserves_time_structure(self):
        """测试缩略图路径保持时间结构"""
        user_id = uuid4()
        size = "medium"
        original_path = "uploads/2025/01/15_143022_123e4567e89b12d.jpg"

        thumbnail_path = generate_thumbnail_path(user_id, size, original_path)

        # 验证缩略图路径保持了原文件的时间结构
        original_parts = Path(original_path).parts
        thumbnail_parts = Path(thumbnail_path).parts

        # 年份和月份应该相同
        assert thumbnail_parts[1] == original_parts[1], "年份不匹配"
        assert thumbnail_parts[2] == original_parts[2], "月份不匹配"

    def test_generate_thumbnail_path_custom_base_dir(self):
        """测试自定义缩略图基础目录"""
        user_id = uuid4()
        size = "medium"
        original_path = "uploads/2025/01/15_143022_123e4567e89b12d.jpg"
        custom_base = "custom_thumbnails"

        thumbnail_path = generate_thumbnail_path(
            user_id, size, original_path, custom_base
        )

        # 验证使用了自定义基础目录
        assert thumbnail_path.startswith(custom_base), (
            f"未使用自定义基础目录: {thumbnail_path}"
        )

    def test_generate_thumbnail_path_fallback_for_invalid_original_path(self):
        """测试原始路径格式不正确时的回退机制"""
        user_id = uuid4()
        size = "medium"
        # 使用不符合预期格式的原始路径
        invalid_original_path = "some/invalid/path/file.jpg"

        thumbnail_path = generate_thumbnail_path(user_id, size, invalid_original_path)

        # 应该能正常生成缩略图路径（使用当前时间作为回退）
        assert thumbnail_path.startswith("thumbnails/"), (
            f"缩略图路径格式不正确: {thumbnail_path}"
        )
        assert thumbnail_path.endswith(".webp"), f"缩略图扩展名不正确: {thumbnail_path}"


class TestFileExtensionUtils:
    """文件扩展名工具函数测试"""

    def test_get_file_extension_normal_cases(self):
        """测试正常情况下的文件扩展名提取"""
        test_cases = [
            ("photo.jpg", "jpg"),
            ("document.PDF", "pdf"),  # 测试大写转小写
            ("archive.tar.gz", "gz"),  # 测试多重扩展名
            ("script.py", "py"),
            ("image.JPEG", "jpeg"),
        ]

        for filename, expected_ext in test_cases:
            actual_ext = get_file_extension(filename)
            assert actual_ext == expected_ext, (
                f"扩展名提取错误: {filename} -> 期望 {expected_ext}, 实际 {actual_ext}"
            )

    def test_get_file_extension_edge_cases(self):
        """测试边缘情况下的文件扩展名提取"""
        test_cases = [
            ("no_extension", "bin"),  # 无扩展名
            ("file.", "bin"),  # 点号但无扩展名
            (".hidden", "hidden"),  # 隐藏文件
            ("", "bin"),  # 空字符串
            ("file.with.multiple.dots.txt", "txt"),  # 多个点号
        ]

        for filename, expected_ext in test_cases:
            actual_ext = get_file_extension(filename)
            assert actual_ext == expected_ext, (
                f"边缘情况扩展名提取错误: {filename} -> 期望 {expected_ext}, 实际 {actual_ext}"
            )


# 运行测试的示例
if __name__ == "__main__":
    # 可以直接运行这个文件进行快速测试
    import sys

    sys.path.append("../../")

    # 创建测试实例并运行
    test_path = TestPathGeneration()
    test_path.test_generate_upload_path_format()
    test_path.test_generate_upload_path_with_different_extensions()

    print("✅ 所有路径生成测试通过！")


class TestFileValidation:
    """文件验证函数测试"""

    def test_validate_file_extension_image_types(self):
        """测试图片文件扩展名验证"""
        valid_images = [
            "photo.jpg",
            "image.jpeg",
            "pic.png",
            "icon.gif",
            "avatar.webp",
            "logo.bmp",
            "diagram.svg",
        ]

        for filename in valid_images:
            assert validate_file_extension(filename, "image"), (
                f"图片文件应该通过验证: {filename}"
            )

    def test_validate_file_extension_video_types(self):
        """测试视频文件扩展名验证"""
        valid_videos = ["movie.mp4", "clip.webm", "video.avi", "film.mov", "record.wmv"]

        for filename in valid_videos:
            assert validate_file_extension(filename, "video"), (
                f"视频文件应该通过验证: {filename}"
            )

    def test_validate_file_extension_document_types(self):
        """测试文档文件扩展名验证"""
        valid_docs = ["report.pdf", "letter.doc", "essay.docx", "note.txt", "readme.md"]

        for filename in valid_docs:
            assert validate_file_extension(filename, "document"), (
                f"文档文件应该通过验证: {filename}"
            )

    def test_validate_file_extension_other_types(self):
        """测试其他类型文件（应该都通过）"""
        other_files = ["data.json", "config.xml", "script.py", "archive.zip"]

        for filename in other_files:
            assert validate_file_extension(filename, "other"), (
                f"其他类型文件应该通过验证: {filename}"
            )

    def test_validate_file_extension_invalid_cases(self):
        """测试无效扩展名情况"""
        invalid_cases = [
            ("document.exe", "image"),  # exe文件不是图片
            ("virus.bat", "video"),  # bat文件不是视频
            ("script.py", "document"),  # py文件不是文档
        ]

        for filename, media_type in invalid_cases:
            assert not validate_file_extension(filename, media_type), (
                f"无效文件应该被拒绝: {filename} as {media_type}"
            )

    def test_validate_file_size_within_limits(self):
        """测试文件大小在限制内的情况"""
        test_cases = [
            (5 * 1024 * 1024, "image"),  # 5MB图片，限制10MB
            (50 * 1024 * 1024, "video"),  # 50MB视频，限制100MB
            (10 * 1024 * 1024, "document"),  # 10MB文档，限制20MB
            (2 * 1024 * 1024, "other"),  # 2MB其他，限制5MB
        ]

        for file_size, media_type in test_cases:
            assert validate_file_size(file_size, media_type), (
                f"文件大小应该通过验证: {file_size} bytes for {media_type}"
            )

    def test_validate_file_size_exceeding_limits(self):
        """测试文件大小超出限制的情况"""
        test_cases = [
            (15 * 1024 * 1024, "image"),  # 15MB图片，超过10MB限制
            (150 * 1024 * 1024, "video"),  # 150MB视频，超过100MB限制
            (25 * 1024 * 1024, "document"),  # 25MB文档，超过20MB限制
            (10 * 1024 * 1024, "other"),  # 10MB其他，超过5MB限制
        ]

        for file_size, media_type in test_cases:
            assert not validate_file_size(file_size, media_type), (
                f"超大文件应该被拒绝: {file_size} bytes for {media_type}"
            )

    def test_validate_file_size_edge_cases(self):
        """测试文件大小边界情况"""
        # 测试刚好等于限制的情况
        edge_cases = [
            (10 * 1024 * 1024, "image"),  # 刚好10MB
            (100 * 1024 * 1024, "video"),  # 刚好100MB
            (20 * 1024 * 1024, "document"),  # 刚好20MB
            (5 * 1024 * 1024, "other"),  # 刚好5MB
        ]

        for file_size, media_type in edge_cases:
            assert validate_file_size(file_size, media_type), (
                f"边界大小应该通过验证: {file_size} bytes for {media_type}"
            )


class TestMediaTypeDetection:
    """媒体类型检测函数测试"""

    def test_detect_media_type_from_filename_images(self):
        """测试从文件名检测图片类型"""
        image_files = [
            "photo.jpg",
            "image.jpeg",
            "pic.png",
            "icon.gif",
            "avatar.webp",
            "logo.bmp",
            "diagram.svg",
        ]

        for filename in image_files:
            media_type = detect_media_type_from_filename(filename)
            assert media_type == "image", (
                f"应该检测为图片类型: {filename} -> {media_type}"
            )

    def test_detect_media_type_from_filename_videos(self):
        """测试从文件名检测视频类型"""
        video_files = ["movie.mp4", "clip.webm", "video.avi", "film.mov", "record.wmv"]

        for filename in video_files:
            media_type = detect_media_type_from_filename(filename)
            assert media_type == "video", (
                f"应该检测为视频类型: {filename} -> {media_type}"
            )

    def test_detect_media_type_from_filename_documents(self):
        """测试从文件名检测文档类型"""
        doc_files = ["report.pdf", "letter.doc", "essay.docx", "note.txt", "readme.md"]

        for filename in doc_files:
            media_type = detect_media_type_from_filename(filename)
            assert media_type == "document", (
                f"应该检测为文档类型: {filename} -> {media_type}"
            )

    def test_detect_media_type_from_filename_others(self):
        """测试从文件名检测其他类型"""
        other_files = ["data.json", "config.xml", "script.py", "archive.zip"]

        for filename in other_files:
            media_type = detect_media_type_from_filename(filename)
            assert media_type == "other", (
                f"应该检测为其他类型: {filename} -> {media_type}"
            )

    def test_detect_media_type_from_mime_images(self):
        """测试从MIME类型检测图片"""
        image_mimes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/bmp",
            "image/svg+xml",
        ]

        for mime_type in image_mimes:
            media_type = detect_media_type_from_mime(mime_type)
            assert media_type == "image", (
                f"应该检测为图片类型: {mime_type} -> {media_type}"
            )

    def test_detect_media_type_from_mime_videos(self):
        """测试从MIME类型检测视频"""
        video_mimes = ["video/mp4", "video/webm", "video/avi", "video/quicktime"]

        for mime_type in video_mimes:
            media_type = detect_media_type_from_mime(mime_type)
            assert media_type == "video", (
                f"应该检测为视频类型: {mime_type} -> {media_type}"
            )

    def test_detect_media_type_from_mime_documents(self):
        """测试从MIME类型检测文档"""
        doc_mimes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "text/markdown",
        ]

        for mime_type in doc_mimes:
            media_type = detect_media_type_from_mime(mime_type)
            assert media_type == "document", (
                f"应该检测为文档类型: {mime_type} -> {media_type}"
            )

    def test_detect_media_type_from_mime_others(self):
        """测试从MIME类型检测其他类型"""
        other_mimes = ["application/json", "application/xml", "application/zip"]

        for mime_type in other_mimes:
            media_type = detect_media_type_from_mime(mime_type)
            assert media_type == "other", (
                f"应该检测为其他类型: {mime_type} -> {media_type}"
            )

    def test_get_mime_type_common_files(self):
        """测试获取常见文件的MIME类型"""
        test_cases = [
            ("photo.jpg", "image/jpeg"),
            ("image.png", "image/png"),
            ("document.pdf", "application/pdf"),
            ("text.txt", "text/plain"),
            ("data.json", "application/json"),
            ("page.html", "text/html"),
        ]

        for filename, expected_mime in test_cases:
            actual_mime = get_mime_type(filename)
            assert actual_mime == expected_mime, (
                f"MIME类型不匹配: {filename} -> 期望 {expected_mime}, 实际 {actual_mime}"
            )

    def test_get_mime_type_unknown_extension(self):
        """测试未知扩展名的MIME类型"""
        unknown_files = ["file.unknown", "data.randomext", "test"]

        for filename in unknown_files:
            mime_type = get_mime_type(filename)
            assert mime_type == "application/octet-stream", (
                f"未知文件应该返回默认MIME类型: {filename} -> {mime_type}"
            )


class TestThumbnailConfiguration:
    """缩略图配置函数测试"""

    def test_get_thumbnail_size_valid_sizes(self):
        """测试获取有效的缩略图尺寸"""
        test_cases = [
            ("small", (150, 150)),
            ("medium", (300, 300)),
            ("large", (600, 600)),
            ("xlarge", (1200, 1200)),
        ]

        for size_name, expected_size in test_cases:
            actual_size = get_thumbnail_size(size_name)
            assert actual_size == expected_size, (
                f"缩略图尺寸不匹配: {size_name} -> 期望 {expected_size}, 实际 {actual_size}"
            )

    def test_get_thumbnail_size_invalid_size(self):
        """测试获取无效的缩略图尺寸（应该返回默认medium）"""
        invalid_sizes = ["tiny", "huge", "invalid", ""]

        for size_name in invalid_sizes:
            actual_size = get_thumbnail_size(size_name)
            assert actual_size == (300, 300), (
                f"无效尺寸应该返回默认medium尺寸: {size_name} -> {actual_size}"
            )

    def test_should_generate_thumbnails_image_files(self):
        """测试图片文件应该生成缩略图"""
        image_files = [
            ("photo.jpg", "image"),
            ("pic.png", "image"),
            ("icon.gif", "image"),
            ("avatar.webp", "image"),
        ]

        for file_path, media_type in image_files:
            should_generate = should_generate_thumbnails(file_path, media_type)
            assert should_generate, f"图片文件应该生成缩略图: {file_path}"

    def test_should_generate_thumbnails_svg_exception(self):
        """测试SVG文件不应该生成缩略图"""
        svg_files = ["icon.svg", "logo.SVG", "diagram.svg"]

        for file_path in svg_files:
            should_generate = should_generate_thumbnails(file_path, "image")
            assert not should_generate, f"SVG文件不应该生成缩略图: {file_path}"

    def test_should_generate_thumbnails_non_image_files(self):
        """测试非图片文件不应该生成缩略图"""
        non_image_files = [
            ("video.mp4", "video"),
            ("document.pdf", "document"),
            ("data.json", "other"),
        ]

        for file_path, media_type in non_image_files:
            should_generate = should_generate_thumbnails(file_path, media_type)
            assert not should_generate, f"非图片文件不应该生成缩略图: {file_path}"


class TestImageProcessing:
    """图片处理函数测试"""

    def test_smart_crop_and_resize_landscape_to_square(self):
        """测试横向图片裁剪为正方形"""
        from PIL import Image

        # 创建800x600的横向图片
        original = Image.new("RGB", (800, 600), color="red")

        # 裁剪为300x300正方形
        result = smart_crop_and_resize(original, (300, 300))

        # 验证结果尺寸
        assert result.size == (300, 300), f"结果尺寸不正确: {result.size}"

    def test_smart_crop_and_resize_portrait_to_square(self):
        """测试纵向图片裁剪为正方形"""
        from PIL import Image

        # 创建600x800的纵向图片
        original = Image.new("RGB", (600, 800), color="blue")

        # 裁剪为300x300正方形
        result = smart_crop_and_resize(original, (300, 300))

        # 验证结果尺寸
        assert result.size == (300, 300), f"结果尺寸不正确: {result.size}"

    def test_smart_crop_and_resize_square_to_rectangle(self):
        """测试正方形图片裁剪为矩形"""
        from PIL import Image

        # 创建600x600的正方形图片
        original = Image.new("RGB", (600, 600), color="green")

        # 裁剪为400x300矩形
        result = smart_crop_and_resize(original, (400, 300))

        # 验证结果尺寸
        assert result.size == (400, 300), f"结果尺寸不正确: {result.size}"

    def test_smart_crop_and_resize_upscaling(self):
        """测试小图片放大"""
        from PIL import Image

        # 创建200x150的小图片
        original = Image.new("RGB", (200, 150), color="yellow")

        # 放大为800x600
        result = smart_crop_and_resize(original, (800, 600))

        # 验证结果尺寸
        assert result.size == (800, 600), f"结果尺寸不正确: {result.size}"

    def test_smart_crop_and_resize_same_ratio(self):
        """测试相同比例的图片调整"""
        from PIL import Image

        # 创建800x600的图片（4:3比例）
        original = Image.new("RGB", (800, 600), color="purple")

        # 调整为400x300（保持4:3比例）
        result = smart_crop_and_resize(original, (400, 300))

        # 验证结果尺寸
        assert result.size == (400, 300), f"结果尺寸不正确: {result.size}"
