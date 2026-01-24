"""
文章模块异常

文章、分类、标签相关的所有业务异常
"""

from app.core.exceptions import BaseAppException


class PostNotFoundError(BaseAppException):
    """文章不存在异常"""

    def __init__(self, message: str = "Post not found"):
        super().__init__(message=message, status_code=404, error_code="POST_NOT_FOUND")


class CategoryNotFoundError(BaseAppException):
    """分类不存在异常"""

    def __init__(self, message: str = "Category not found"):
        super().__init__(
            message=message, status_code=404, error_code="CATEGORY_NOT_FOUND"
        )


class TagNotFoundError(BaseAppException):
    """标签不存在异常"""

    def __init__(self, message: str = "Tag not found"):
        super().__init__(message=message, status_code=404, error_code="TAG_NOT_FOUND")


class CategoryTypeMismatchError(BaseAppException):
    """分类与板块类型不匹配异常"""

    def __init__(self, message: str = "Category type mismatch with post type"):
        super().__init__(
            message=message, status_code=400, error_code="CATEGORY_TYPE_MISMATCH"
        )


class SlugConflictError(BaseAppException):
    """Slug 冲突异常"""

    def __init__(self, message: str = "Slug already exists"):
        super().__init__(message=message, status_code=400, error_code="SLUG_CONFLICT")


class PostProcessingError(BaseAppException):
    """文章处理异常（MDX 解析、图片上传等）"""

    def __init__(self, message: str = "Post processing failed"):
        super().__init__(
            message=message, status_code=400, error_code="POST_PROCESSING_FAILED"
        )
