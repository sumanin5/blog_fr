"""
媒体文件API测试配置

提供媒体文件上传测试的隔离和清理功能
"""

import tempfile
from pathlib import Path
from typing import Generator

import pytest


@pytest.fixture(autouse=True)
def temp_media_dir() -> Generator[Path, None, None]:
    """
    为每个测试创建独立的临时媒体目录

    - 每个测试完全隔离，不会相互影响
    - 测试结束后自动清理，不留垃圾文件
    """
    from app.core.config import settings

    # 保存原始配置
    original_media_root = settings.MEDIA_ROOT

    # 创建临时目录
    with tempfile.TemporaryDirectory(prefix="test_media_") as temp_dir:
        # 动态设置媒体根目录
        settings.MEDIA_ROOT = temp_dir

        yield Path(temp_dir)

        # 恢复原始配置
        settings.MEDIA_ROOT = original_media_root


@pytest.fixture
def sample_image_data() -> bytes:
    """提供测试用的PNG图片数据 (800x600)"""
    import io

    from PIL import Image

    img = Image.new("RGB", (800, 600), color="red")
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)
    return img_bytes.getvalue()


@pytest.fixture
def sample_jpeg_data() -> bytes:
    """提供测试用的JPEG图片数据 (1024x768)"""
    import io

    from PIL import Image

    img = Image.new("RGB", (1024, 768), color="blue")
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="JPEG", quality=85)
    img_bytes.seek(0)
    return img_bytes.getvalue()


@pytest.fixture
def sample_webp_data() -> bytes:
    """提供测试用的WebP图片数据 (640x480)"""
    import io

    from PIL import Image

    img = Image.new("RGB", (640, 480), color="green")
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="WebP", quality=80)
    img_bytes.seek(0)
    return img_bytes.getvalue()


@pytest.fixture
def large_image_data() -> bytes:
    """提供测试用的大尺寸图片数据 (2000x1500) - 适合测试所有缩略图尺寸"""
    import io

    from PIL import Image

    img = Image.new("RGB", (2000, 1500), color="purple")
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="JPEG", quality=90)
    img_bytes.seek(0)
    return img_bytes.getvalue()


@pytest.fixture
def small_image_data() -> bytes:
    """提供测试用的小尺寸图片数据 (200x150) - 测试放大效果"""
    import io

    from PIL import Image

    img = Image.new("RGB", (200, 150), color="orange")
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)
    return img_bytes.getvalue()
