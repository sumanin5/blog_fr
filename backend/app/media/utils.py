"""
媒体文件工具函数

包含路径生成、文件验证、异步文件处理等纯函数
"""

import asyncio
import logging
import mimetypes
from io import BytesIO
from pathlib import Path
from typing import Optional
from uuid import UUID, uuid4

import aiofiles
import aiofiles.os
from PIL import Image

logger = logging.getLogger(__name__)


# ==========================================
# 路径生成函数
# ==========================================


def generate_upload_path(
    user_id: UUID, filename: str, base_dir: Optional[str] = None
) -> str:
    """生成媒体文件存储路径（按时间组织）

    Args:
        user_id: 用户UUID
        filename: 原始文件名
        base_dir: 基础目录，如果为None则使用默认的"uploads"

    Returns:
        str: 生成的相对文件路径，格式: "uploads/2025/01/15_143022_123e4567e89b12d.jpg"
    """
    from datetime import datetime

    # 使用默认的相对路径
    if base_dir is None:
        base_dir = "uploads"

    # 获取当前时间
    now = datetime.now()

    # 提取文件扩展名
    ext = get_file_extension(filename)

    # 生成UUID并取前15位（去掉连字符）
    file_uuid = str(uuid4()).replace("-", "")[:15]

    # 构建文件名：日期_时分秒_UUID前15位.扩展名
    # 格式：15_143022_123e4567e89b12d.jpg
    new_filename = f"{now.day:02d}_{now.strftime('%H%M%S')}_{file_uuid}.{ext}"

    # 构建相对路径：uploads/年份/月份/文件名
    path = f"{base_dir}/{now.year}/{now.month:02d}/{new_filename}"

    logger.debug(f"生成上传路径: {path}")
    return path


def generate_thumbnail_path(
    user_id: UUID, size: str, original_path: str, base_dir: Optional[str] = None
) -> str:
    """生成缩略图存储路径（按时间组织）

    Args:
        user_id: 用户UUID
        size: 缩略图尺寸标识 (如 "small", "medium", "large")
        original_path: 原始文件路径
        base_dir: 基础目录，如果为None则使用默认的"thumbnails"

    Returns:
        str: 生成的缩略图相对路径
    """
    from datetime import datetime

    # 使用默认的相对路径
    if base_dir is None:
        base_dir = "thumbnails"

    # 从原始路径提取时间信息和文件名
    # 原始路径格式: uploads/2025/01/15_143022_123e4567e89b12d.jpg
    path_parts = Path(original_path).parts

    if len(path_parts) >= 3:  # uploads/年份/月份/文件名
        year = path_parts[-3]  # 倒数第三个是年份
        month = path_parts[-2]  # 倒数第二个是月份
        original_filename = Path(original_path).stem  # 不含扩展名
    else:
        # 如果路径格式不符合预期，使用当前时间
        now = datetime.now()
        year = str(now.year)
        month = f"{now.month:02d}"
        original_filename = Path(original_path).stem

    # 生成缩略图文件名：尺寸_原始文件名.webp
    thumbnail_filename = f"{size}_{original_filename}.webp"

    # 构建相对路径：thumbnails/年份/月份/缩略图文件名
    path = f"{base_dir}/{year}/{month}/{thumbnail_filename}"

    logger.debug(f"生成缩略图路径: {path}")
    return path


def get_file_extension(filename: str) -> str:
    """提取文件扩展名

    Args:
        filename: 文件名

    Returns:
        str: 文件扩展名（小写，不包含点）
    """
    if "." not in filename:
        return "bin"

    ext = filename.split(".")[-1].lower()
    return ext if ext else "bin"


# ==========================================
# 异步文件操作函数
# ==========================================


async def ensure_directory_exists(file_path: str) -> None:
    """确保文件路径的目录存在

    Args:
        file_path: 文件路径
    """
    directory = Path(file_path).parent
    await aiofiles.os.makedirs(directory, exist_ok=True)
    logger.debug(f"确保目录存在: {directory}")


async def save_file_to_disk(file_content: bytes, file_path: str) -> None:
    """异步保存文件到磁盘

    Args:
        file_content: 文件内容
        file_path: 文件路径
    """
    await ensure_directory_exists(file_path)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_content)
    logger.debug(f"文件已保存: {file_path}")


async def delete_file_from_disk(file_path: str) -> bool:
    """异步删除文件

    Args:
        file_path: 文件路径

    Returns:
        bool: 是否成功删除
    """
    try:
        if await aiofiles.os.path.exists(file_path):
            await aiofiles.os.remove(file_path)
            logger.debug(f"文件已删除: {file_path}")
            return True
        return False
    except Exception as e:
        logger.error(f"删除文件失败 {file_path}: {e}")
        return False


# ==========================================
# 图片处理函数
# ==========================================


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


# ==========================================
# 文件验证函数
# ==========================================

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"},
    "video": {".mp4", ".webm", ".avi", ".mov", ".wmv"},
    "document": {".pdf", ".doc", ".docx", ".txt", ".rtf", ".md", ".mdx"},
}

# 文件大小限制 (字节)
# 注意：这些限制在业务逻辑层面生效，全局上传限制为 150MB（在 middleware 中定义）
MAX_FILE_SIZES = {
    "image": 10 * 1024 * 1024,  # 10MB - 普通图片（封面、截图等）
    "video": 100 * 1024 * 1024,  # 100MB - 短视频、Demo视频
    "document": 20 * 1024 * 1024,  # 20MB - PDF、Word文档等
    "other": 5 * 1024 * 1024,  # 5MB - 其他文件
}

# 在 validate_file_extension 函数中添加黑名单
FORBIDDEN_EXTENSIONS = {".exe", ".bat", ".cmd", ".scr", ".com", ".pif"}


def validate_file_extension(filename: str, media_type: str) -> bool:
    ext = f".{get_file_extension(filename)}"

    # 检查黑名单
    if ext.lower() in FORBIDDEN_EXTENSIONS:
        return False

    allowed_exts = ALLOWED_EXTENSIONS.get(media_type, set())
    if not allowed_exts:  # 'other' 类型允许所有扩展名（除了黑名单）
        return True
    return ext in allowed_exts


def validate_file_size(file_size: int, media_type: str) -> bool:
    """验证文件大小

    Args:
        file_size: 文件大小（字节）
        media_type: 媒体类型

    Returns:
        bool: 是否在允许的大小范围内
    """
    max_size = MAX_FILE_SIZES.get(media_type, MAX_FILE_SIZES["other"])
    return file_size <= max_size


def detect_media_type_from_filename(filename: str) -> str:
    """根据文件名检测媒体类型

    Args:
        filename: 文件名

    Returns:
        str: 检测到的媒体类型
    """
    ext = f".{get_file_extension(filename)}"

    # 根据扩展名判断
    for media_type, extensions in ALLOWED_EXTENSIONS.items():
        if ext in extensions:
            return media_type

    return "other"


def detect_media_type_from_mime(mime_type: str) -> str:
    """根据MIME类型检测媒体类型

    Args:
        mime_type: MIME类型

    Returns:
        str: 检测到的媒体类型
    """
    if mime_type.startswith("image/"):
        return "image"
    elif mime_type.startswith("video/"):
        return "video"
    elif mime_type in [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
        "text/x-markdown",  # MDX文件的MIME类型
    ]:
        return "document"
    else:
        return "other"


def get_mime_type(filename: str) -> str:
    """获取文件的MIME类型

    Args:
        filename: 文件名

    Returns:
        str: MIME类型
    """
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or "application/octet-stream"


# ==========================================
# 缩略图配置
# ==========================================

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


# ==========================================
# 缩略图生成函数（工具层）
# ==========================================


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
    for thumbnail_path in thumbnails.values():
        full_path = f"{media_root}/{thumbnail_path}"
        await delete_file_from_disk(full_path)
