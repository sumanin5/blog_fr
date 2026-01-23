"""
媒体文件业务逻辑服务

拆分为以下子模块：
- access: 文件访问服务（查看/下载）
- management: 文件管理服务（更新/删除）
- thumbnail: 缩略图服务
- upload: 上传服务
- _permissions: 权限检查工具
"""

from . import access, management, thumbnail, upload

__all__ = [
    "access",
    "management",
    "thumbnail",
    "upload",
]
