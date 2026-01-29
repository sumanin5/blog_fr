import os
import sys

import uvicorn

# 确保 backend 目录在 path 中
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    print("🚀 正在启动前端集成测试专用后端服务...")

    # 1. 强制设置测试环境变量
    os.environ["ENVIRONMENT"] = "test"
    # 使用独立的 SQLite 数据库，避免污染开发库
    # 需要安装 aiosqlite: uv add --dev aiosqlite
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_server.db"

    print(f"🌍 环境: {os.environ['ENVIRONMENT']}")
    print(f"📦 数据库: {os.environ['DATABASE_URL']}")

    # 2. 延迟导入 app，确保环境变量生效
    try:
        # Patch JSONB for SQLite
        import sqlalchemy.dialects.postgresql
        from sqlalchemy import JSON

        sqlalchemy.dialects.postgresql.JSONB = JSON

        from app.api.test_router import router as test_router
        from app.main import app

        # 3. 挂载测试专用路由 (Reset DB)
        app.include_router(test_router, prefix="/api/test", tags=["Test"])

        print("✅ 测试路由已挂载: /api/test/db/reset")
        print("YOUR FRONTEND TESTS SHOULD CONNECT TO: http://127.0.0.1:8001")

        # 4. 启动服务 (端口 8001)
        uvicorn.run(app, host="127.0.0.1", port=8001)

    except ImportError as e:
        print(f"❌ 导入失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        sys.exit(1)
