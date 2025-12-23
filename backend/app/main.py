import logging

from app.core.customID import custom_generate_unique_id
from app.initial_data import init_db
from app.middleware import setup_middleware
from app.users.router import router as users_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)


app = FastAPI(
    title="Blog API",
    version="0.1.0",
    description="博客系统 API",
    generate_unique_id_function=custom_generate_unique_id,
)

# ============================================================
# CORS 配置：允许前端跨域访问
# ============================================================
# 开发环境允许的前端地址
origins = [
    "http://localhost:5173",  # Vite 开发服务器
    "http://localhost:3000",  # 备用端口
    "http://127.0.0.1:5173",
    "http://localhost:5174",  # Vite 开发服务器
    "http://127.0.0.1:5174",  # Vite 开发服务器
    "http://localhost:4173",  # vite 生产服务器
    "http://127.0.0.1:4173",  # vite 生产服务器
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


# ============================================================
# 包含用户路由
# ============================================================
app.include_router(users_router, prefix="/users", tags=["users"])
