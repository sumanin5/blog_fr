import logging
from pathlib import Path

from app.analytics.router import router as analytics_router
from app.core.config import settings
from app.core.customID import custom_generate_unique_id
from app.core.error_handlers import (
    app_exception_handler,
    database_exception_handler,
    unexpected_exception_handler,
    validation_exception_handler,
)
from app.core.exceptions import BaseAppException
from app.core.monitoring import setup_monitoring
from app.core.schemas import ErrorResponse
from app.core.tags_metadata import DESCRIPTION, TAGS_METADATA
from app.git_ops.router import router as git_ops_router
from app.initial_data import init_db
from app.media.routers import router as media_router
from app.middleware import setup_middleware
from app.posts.routers import router as posts_router
from app.users.router import router as users_router
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi_pagination import add_pagination
from scalar_fastapi import get_scalar_api_reference
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)


app = FastAPI(
    title="Blog API",
    version="0.1.0",
    description=DESCRIPTION,
    openapi_tags=TAGS_METADATA,  # ← 添加 tags metadata
    generate_unique_id_function=custom_generate_unique_id,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        404: {"model": ErrorResponse, "description": "Not Found"},
        422: {"model": ErrorResponse, "description": "Validation Error"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
)

# ============================================================
# 异常处理器注册
# ============================================================
app.add_exception_handler(BaseAppException, app_exception_handler)  # type: ignore
app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore
app.add_exception_handler(SQLAlchemyError, database_exception_handler)  # type: ignore
app.add_exception_handler(Exception, unexpected_exception_handler)  # type: ignore

# ============================================================
# CORS 配置：允许前端跨域访问
# ============================================================
# 开发环境允许的前端地址
origins = [
    "http://localhost:3000",  # Next.js 开发服务器
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # Vite 开发服务器（兼容旧项目）
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 允许的前端地址
    allow_credentials=True,  # 允许携带 Cookie
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有请求头
)

# 设置所有的自定义中间件
setup_middleware(app)

# 设置 APM 监控（Sentry、OpenTelemetry、性能监控）
setup_monitoring(app)

#  分页插件
add_pagination(app)


# ============================================================
# 启动事件：初始化数据库数据
# ============================================================
@app.on_event("startup")
async def startup_event():
    """在应用启动时运行初始化脚本"""
    try:
        logger.info("开始初始化数据库数据...")
        await init_db()
        logger.info("数据库初始化完成")
    except Exception as e:
        logger.error(f"启动时初始化数据失败: {e}")
        # 可选：根据需要决定是否让启动失败
        # raise


@app.get("/")
async def read_root():
    return {"Hello": "fastapi"}


@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    """Scalar API 文档界面 - 比 Swagger UI 更现代化"""
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
    )


# ============================================================
# 包含路由
# ============================================================
# 主路由设置主标签，子路由可以设置更细的子标签
app.include_router(users_router, prefix=f"{settings.API_PREFIX}/users", tags=["Users"])
app.include_router(
    media_router, prefix=f"{settings.API_PREFIX}/media"
)  # media 子路由自己设置 tags
app.include_router(posts_router, prefix=f"{settings.API_PREFIX}")
app.include_router(
    git_ops_router,
    prefix=f"{settings.API_PREFIX}/ops/git",
    tags=["GitOps (Admin Only)"],
)
app.include_router(
    analytics_router,
    prefix=f"{settings.API_PREFIX}/analytics",
    tags=["Analytics"],
)

# ============================================================
# 静态文件服务：挂载媒体文件目录（必须在路由之后）
# ============================================================
media_path = Path(settings.MEDIA_ROOT).resolve()
logger.info(f"尝试挂载媒体文件目录: {media_path}")
logger.info(f"目录是否存在: {media_path.exists()}")
if media_path.exists():
    logger.info(f"目录内容: {list(media_path.iterdir())[:5]}")
    app.mount("/media", StaticFiles(directory=str(media_path)), name="media")
    logger.info(f"✅ 静态文件服务已挂载: /media -> {media_path}")
else:
    logger.error(f"❌ 媒体文件目录不存在: {media_path}")
