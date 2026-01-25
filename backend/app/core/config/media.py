from pydantic import Field


class MediaSettings:
    """媒体文件管理配置项"""

    MEDIA_ROOT: str = Field(default="media", description="媒体文件存储根目录")
    MEDIA_URL: str = Field(
        default="http://localhost:8000/media/", description="媒体文件访问URL前缀"
    )
