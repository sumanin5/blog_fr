"""
媒体文件模块异常

媒体文件相关的所有业务异常
"""

from app.core.exceptions import BaseAppException


class MediaFileNotFoundError(BaseAppException):
    """媒体文件不存在异常"""

    def __init__(self, message: str = "Media file not found"):
        super().__init__(
            message=message, status_code=404, error_code="MEDIA_FILE_NOT_FOUND"
        )


class UnsupportedFileTypeError(BaseAppException):
    """不支持的文件类型异常"""

    def __init__(self, message: str = "Unsupported file type"):
        super().__init__(
            message=message, status_code=400, error_code="UNSUPPORTED_FILE_TYPE"
        )


class FileSizeExceededError(BaseAppException):
    """文件大小超出限制异常"""

    def __init__(self, message: str = "File size exceeded limit"):
        super().__init__(
            message=message, status_code=413, error_code="FILE_SIZE_EXCEEDED"
        )


class FileProcessingError(BaseAppException):
    """文件处理异常"""

    def __init__(self, message: str = "File processing failed"):
        super().__init__(
            message=message, status_code=500, error_code="FILE_PROCESSING_ERROR"
        )


class ThumbnailGenerationError(BaseAppException):
    """缩略图生成异常"""

    def __init__(self, message: str = "Thumbnail generation failed"):
        super().__init__(
            message=message, status_code=500, error_code="THUMBNAIL_GENERATION_ERROR"
        )


class FileStorageError(BaseAppException):
    """文件存储异常"""

    def __init__(self, message: str = "File storage failed"):
        super().__init__(
            message=message, status_code=500, error_code="FILE_STORAGE_ERROR"
        )


class InvalidFileContentError(BaseAppException):
    """无效文件内容异常"""

    def __init__(self, message: str = "Invalid file content"):
        super().__init__(
            message=message, status_code=400, error_code="INVALID_FILE_CONTENT"
        )
