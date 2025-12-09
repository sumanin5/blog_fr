#!/usr/bin/env python3
"""
OpenAPI 规范自动导出脚本

这个脚本的作用是从 FastAPI 应用中提取 OpenAPI 规范，
并自动保存到指定位置，供前端代码生成器使用。

思路类比：
  想象你开了一家餐厅（后端 API），你需要给客人一份菜单（OpenAPI 规范）。
  这个脚本就像是「自动打印菜单」的机器：
    1. 读取厨房（FastAPI）能做的所有菜品（API 端点）
    2. 整理成标准格式的菜单（JSON 文件）
    3. 放到餐厅门口（frontend 目录）让客人（前端开发者）能看到

使用方法：
==========

【本地开发环境】
  cd backend
  python scripts/export_openapi.py

  或者通过 uv 运行：
  cd backend
  uv run python scripts/export_openapi.py

【Docker 环境】
  # 方式1：在运行中的容器内执行
  docker compose -f docker-compose.dev.yml exec backend python scripts/export_openapi.py

  # 方式2：单独运行容器执行脚本
  docker compose -f docker-compose.dev.yml run --rm backend python scripts/export_openapi.py

【自动化建议】
  你可以将此脚本添加到以下场景：
    - Git pre-commit hook（提交前自动更新）
    - CI/CD 流程（构建前自动生成）
    - npm script（前端生成前先更新规范）

输出位置：
=========
  - docs/api/openapi.json      （版本控制用）
  - frontend/openapi.json      （前端代码生成用）
"""

import json
import sys
from pathlib import Path

# ============================================================
# 路径配置
# ============================================================

# 获取项目根目录（无论从哪里运行脚本都能正确定位）
# 脚本位置: backend/scripts/export_openapi.py
# 项目根目录: 脚本上两级目录的父目录
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

# 输出目标位置
OUTPUT_PATHS = [
    PROJECT_ROOT / "docs" / "api" / "openapi.json",  # 文档目录
    PROJECT_ROOT / "frontend" / "openapi.json",  # 前端目录
]

# ============================================================
# 主逻辑
# ============================================================


def export_openapi():
    """
    导出 OpenAPI 规范到指定位置

    工作流程：
      1. 导入 FastAPI 应用实例
      2. 调用 app.openapi() 获取规范字典
      3. 保存为格式化的 JSON 文件
    """
    print("=" * 60)
    print("📋 OpenAPI 规范导出工具")
    print("=" * 60)

    # 确保能导入 app 模块
    # 将 backend 目录添加到 Python 路径
    sys.path.insert(0, str(BACKEND_DIR))

    try:
        # 导入 FastAPI 应用
        print("\n🔍 正在加载 FastAPI 应用...")
        from app.main import app

        print("   ✅ 应用加载成功")

        # 获取 OpenAPI 规范
        print("\n📖 正在生成 OpenAPI 规范...")
        openapi_schema = app.openapi()
        print("   ✅ 规范生成成功")
        print(
            f"   📊 API 版本: {openapi_schema.get('info', {}).get('version', 'unknown')}"
        )
        print(f"   📊 端点数量: {len(openapi_schema.get('paths', {}))} 个")

        # 保存到各个目标位置
        print("\n💾 正在保存文件...")
        for output_path in OUTPUT_PATHS:
            # 确保目录存在
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # 写入格式化的 JSON
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(openapi_schema, f, ensure_ascii=False, indent=2)

            # 计算相对路径用于显示
            try:
                relative_path = output_path.relative_to(PROJECT_ROOT)
            except ValueError:
                relative_path = output_path

            print(f"   ✅ {relative_path}")

        print("\n" + "=" * 60)
        print("🎉 导出完成！")
        print("=" * 60)
        print("\n下一步：")
        print("  cd frontend")
        print("  npm run api:generate")
        print()

        return True

    except ImportError as e:
        print(f"\n❌ 导入错误: {e}")
        print("\n请确保：")
        print("  1. 在 backend 目录下运行此脚本")
        print("  2. 已安装所有依赖 (uv sync)")
        return False

    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = export_openapi()
    sys.exit(0 if success else 1)
