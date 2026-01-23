"""
媒体文件模块

提供媒体文件的完整功能：
- crud: 数据库操作
- services: 业务逻辑
- routers: API路由
- utils: 工具函数
- schemas: Pydantic schemas
"""

# 导出 CRUD 操作（向后兼容）
# 导出 schemas（向后兼容）
from . import schemas
from .cruds import basic, query, stats


# 创建 crud 命名空间（向后兼容旧的导入方式）
class _CRUDNamespace:
    """CRUD 命名空间，用于向后兼容"""

    def __getattr__(self, name):
        # 尝试从各个子模块导入
        for module in [basic, query, stats]:
            if hasattr(module, name):
                return getattr(module, name)
        raise AttributeError(f"module 'crud' has no attribute '{name}'")


crud = _CRUDNamespace()

# 导出 services（向后兼容）
from .services import access, management, thumbnail, upload


# 创建 service 命名空间（向后兼容旧的导入方式）
class _ServiceNamespace:
    """Service 命名空间，用于向后兼容"""

    def __getattr__(self, name):
        # 尝试从各个 service 子模块导入
        for module in [access, management, thumbnail, upload]:
            if hasattr(module, name):
                return getattr(module, name)
        # 如果 service 中没有，尝试从 crud 模块导入（某些函数可能在 crud 层）
        for module in [basic, query, stats]:
            if hasattr(module, name):
                return getattr(module, name)
        raise AttributeError(f"module 'service' has no attribute '{name}'")


service = _ServiceNamespace()

# 导出 router（向后兼容）
from .routers import router

__all__ = [
    "crud",
    "service",
    "router",
    "schemas",
    # 子模块
    "basic",
    "query",
    "stats",
    "access",
    "management",
    "thumbnail",
    "upload",
]
