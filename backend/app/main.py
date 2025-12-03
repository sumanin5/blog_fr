from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.users.router import router as users_router

app = FastAPI()

# ============================================================
# CORS 配置：允许前端跨域访问
# ============================================================
# 开发环境允许的前端地址
origins = [
    "http://localhost:5173",  # Vite 开发服务器
    "http://localhost:3000",  # 备用端口
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 允许的前端地址
    allow_credentials=True,  # 允许携带 Cookie
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有请求头
)


@app.get("/")
async def read_root():
    return {"Hello": "fastapi"}

# ============================================================
# 包含用户路由
# ============================================================
app.include_router(users_router, prefix="/users", tags=["users"])
