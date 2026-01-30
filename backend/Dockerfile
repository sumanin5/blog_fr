# ==========================================
# 阶段 1：开发/测试镜像
# ==========================================
# 这个阶段包含所有依赖（包括 pytest、jupyter 等开发工具）
# 用于本地开发、运行测试和调试
FROM python:3.13-slim AS development

# 设置环境变量，让 python 的输出直接打印到控制台
ENV PYTHONUNBUFFERED=1

# 设置工作目录
WORKDIR /app/

# 安装系统依赖 (包括 git)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# ==========================================
# 安装 uv
# ==========================================
COPY --from=ghcr.io/astral-sh/uv:0.8.13 /uv /uvx /bin/

# ==========================================
# 配置环境变量
# ==========================================
ENV PATH="/app/.venv/bin:$PATH"
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PYTHONPATH=/app

# ==========================================
# 安装依赖（包括 dev）
# ==========================================
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --all-extras --no-install-project

# ==========================================
# 复制代码
# ==========================================
COPY . /app

# ==========================================
# 安装项目本身
# ==========================================
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --all-extras

# ==========================================
# 可选：运行测试（如果 tests 目录存在）
# ==========================================
# 如果你有 pytest 测试，取消注释这行
# RUN pytest tests/ --tb=short || true


# ==========================================
# 阶段 2：生产镜像
# ==========================================
# 这个阶段只包含运行 API 必需的依赖
# 体积小、安全性高、启动快
FROM python:3.13-slim AS production

# 设置环境变量，让 python 的输出直接打印到控制台
ENV PYTHONUNBUFFERED=1

# 设置工作目录
WORKDIR /app/

# 安装系统依赖 (包括 git)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# ==========================================
# 安装 uv
# ==========================================
COPY --from=ghcr.io/astral-sh/uv:0.8.13 /uv /uvx /bin/

# ==========================================
# 配置环境变量
# ==========================================
ENV PATH="/app/.venv/bin:$PATH"
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PYTHONPATH=/app

# ==========================================
# 安装依赖（只安装主依赖，不装 dev）
# ==========================================
# 这一步排除了 pytest、jupyter 等开发工具
# 最终的生产镜像会很轻量
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project

# ==========================================
# 复制代码
# ==========================================
COPY . /app

# ==========================================
# 再次同步（安装项目本身）
# ==========================================
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

# ==========================================
# 下载 ip2region 数据库（自动模式）
# ==========================================
RUN python scripts/download_ip2region.py --auto || echo "⚠ ip2region 数据库下载失败，将在启动时重试"

# ==========================================
# 启动命令
# ==========================================
# 使用 fastapi 官方推荐的生产环境启动命令
CMD ["fastapi", "run", "--workers", "4", "app/main.py"]
