"""
缩略图生成和处理函数
"""

import asyncio
import logging
from io import BytesIO
from typing import Optional
from uuid import UUID

import aiofiles
import aiofiles.os
from PIL import Image

from .file_ops import save_file_to_disk
from .path import generate_thumbnail_path

logger = logging.getLogger(__name__)


# 缩略图配置
THUMBNAIL_SIZES = {
    "small": (150, 150),
    "medium": (300, 300),
    "large": (600, 600),
    "xlarge": (1200, 1200),
}


def get_thumbnail_size(size_name: str) -> tuple[int, int]:
    """获取缩略图尺寸

    Args:
        size_name: 尺寸名称

    Returns:
        tuple: (width, height)
    """
    return THUMBNAIL_SIZES.get(size_name, THUMBNAIL_SIZES["medium"])


def should_generate_thumbnails(file_path: str, media_type: str) -> bool:
    """检查是否应该生成缩略图

    Args:
        file_path: 文件路径
        media_type: 媒体类型

    Returns:
        bool: 是否应该生成缩略图
    """
    # SVG 文件不需要缩略图
    if file_path.lower().endswith(".svg"):
        return False

    # 只为图片生成缩略图
    return media_type == "image"


async def load_and_process_image(source_path: str) -> Optional[tuple[bytes, int, int]]:
    """异步加载并处理图片

    Args:
        source_path: 源图片路径

    Returns:
        tuple: (processed_image_data, width, height) 或 None
    """
    if not await aiofiles.os.path.exists(source_path):
        logger.error(f"源文件不存在: {source_path}")
        return None

    # 异步读取文件
    async with aiofiles.open(source_path, "rb") as f:
        image_data = await f.read()

    # CPU 密集型任务放到线程池
    def process_image():
        image = Image.open(BytesIO(image_data))

        # 处理颜色模式
        if image.mode in ("RGBA", "LA", "P"):
            logger.debug(f"转换图片模式 {image.mode} -> RGB")
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "RGBA":
                background.paste(image, mask=image.split()[-1])
            else:
                background.paste(image)
            image = background
        elif image.mode == "CMYK":
            logger.debug("转换 CMYK -> RGB")
            image = image.convert("RGB")

        # 转换为字节数据
        output = BytesIO()
        image.save(output, format="JPEG", quality=95)
        processed_data = output.getvalue()

        return processed_data, image.size[0], image.size[1]

    return await asyncio.get_event_loop().run_in_executor(None, process_image)


def smart_crop_and_resize(
    image: Image.Image, target_size: tuple[int, int]
) -> Image.Image:
    """智能裁剪并调整图片尺寸

    Args:
        image: PIL Image 对象
        target_size: 目标尺寸 (width, height)

    Returns:
        Image: 处理后的图片
    """
    original_width, original_height = image.size
    target_width, target_height = target_size

    # 计算比例
    target_ratio = target_width / target_height
    original_ratio = original_width / original_height

    if original_ratio > target_ratio:
        # 原图更宽，裁剪宽度
        new_width = int(original_height * target_ratio)
        new_height = original_height
        left = (original_width - new_width) // 2
        top = 0
        right = left + new_width
        bottom = new_height
    else:
        # 原图更高，裁剪高度
        new_width = original_width
        new_height = int(original_width / target_ratio)
        left = 0
        top = (original_height - new_height) // 2
        right = new_width
        bottom = top + new_height

    # 裁剪并调整尺寸
    cropped = image.crop((left, top, right, bottom))
    return cropped.resize(target_size, Image.Resampling.LANCZOS)


async def create_thumbnail(
    image_data: bytes, target_size: tuple[int, int], output_path: str
) -> bool:
    """创建单个缩略图

    Args:
        image_data: 处理后的图片数据
        target_size: 目标尺寸 (width, height)
        output_path: 输出路径

    Returns:
        bool: 是否成功创建
    """

    # CPU 密集型任务：生成缩略图
    def generate_thumbnail():
        image = Image.open(BytesIO(image_data))
        thumbnail = smart_crop_and_resize(image, target_size)

        # 保存为 WebP 格式
        output = BytesIO()
        thumbnail.save(output, format="WebP", quality=85, optimize=True)
        return output.getvalue()

    thumbnail_data = await asyncio.get_event_loop().run_in_executor(
        None, generate_thumbnail
    )

    # 异步写入文件
    await save_file_to_disk(thumbnail_data, output_path)
    logger.debug(f"缩略图已创建: {output_path}")
    return True


async def generate_all_thumbnails_for_file(
    source_path: str, user_id: UUID, file_relative_path: str
) -> dict[str, str]:
    """为文件生成所有尺寸的缩略图（纯工具函数）

    Args:
        source_path: 源文件路径
        user_id: 用户ID
        file_relative_path: 文件的相对路径（如 uploads/2025/12/24_121337_1c16cdf6500844a.png）

    Returns:
        dict: 生成的缩略图路径字典 {size_name: relative_path}
    """
    from app.core.config import settings

    # 1. 加载并处理原始图片
    image_info = await load_and_process_image(source_path)
    if not image_info:
        return {}

    image_data, width, height = image_info

    # 2. 生成各种尺寸的缩略图
    thumbnails = {}
    for size_name, size in THUMBNAIL_SIZES.items():
        # 生成相对路径
        thumbnail_relative_path = generate_thumbnail_path(
            user_id, size_name, file_relative_path
        )
        # 构建完整路径
        full_path = f"{settings.MEDIA_ROOT}/{thumbnail_relative_path}"

        success = await create_thumbnail(image_data, size, full_path)
        if success:
            thumbnails[size_name] = thumbnail_relative_path

    return thumbnails


async def cleanup_all_thumbnails(thumbnails: dict[str, str], media_root: str) -> None:
    """清理所有缩略图文件（纯工具函数）

    Args:
        thumbnails: 缩略图路径字典
        media_root: 媒体文件根目录
    """
    from .file_ops import delete_file_from_disk

    for thumbnail_path in thumbnails.values():
        full_path = f"{media_root}/{thumbnail_path}"
        await delete_file_from_disk(full_path)
