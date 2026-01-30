#!/bin/bash
set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.prod.local"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.local.yml"

echo -e "${BLUE}🚀 准备在本地模拟生产环境部署...${NC}"

# 1. 检查环境变量文件
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误：未找到 .env.prod.local${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 使用环境配置: .env.prod.local${NC}"
echo -e "${GREEN}✅ 使用编排文件: docker-compose.prod.local.yml${NC}"

# 定义镜像名
REGISTRY="crpi-qvig00qix6yo4bi5.cn-hangzhou.personal.cr.aliyuncs.com/blog-project"
BACKEND_IMG="$REGISTRY/blog-backend:latest"
FRONTEND_IMG="$REGISTRY/blog-frontend:latest"
CADDY_IMG="$REGISTRY/blog-caddy:latest"

# 1.5. 询问是否删除旧镜像
echo ""
echo -e "${YELLOW}是否删除旧镜像以节省空间？${NC}"
read -p "确认删除？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🗑️  正在删除旧镜像...${NC}"
    docker rmi "$BACKEND_IMG" 2>/dev/null || true
    docker rmi "$FRONTEND_IMG" 2>/dev/null || true
    docker rmi "$CADDY_IMG" 2>/dev/null || true
    echo -e "${GREEN}✅ 旧镜像已删除${NC}"
else
    echo -e "${YELLOW}跳过删除镜像${NC}"
fi

# 2. 本地构建生产镜像
echo -e "${BLUE}🔨 正在本地构建生产镜像 (模拟线上 Registry)...${NC}"

# 构建 Backend
echo -e "${BLUE}  -> 构建 Backend...${NC}"
# 注意：我们使用 production 阶段
docker build -t "$BACKEND_IMG" ./backend

# 构建 Frontend
echo -e "${BLUE}  -> 构建 Frontend (API: http://localhost:8080)...${NC}"
# 强制 --no-cache 以确保 next.config.ts 等配置更新被重新编译
docker build --no-cache \
  --build-arg NEXT_PUBLIC_API_URL="http://localhost:8080" \
  -t "$FRONTEND_IMG" ./frontend

# 构建 Caddy
echo -e "${BLUE}  -> 构建 Caddy...${NC}"
docker build -t "$CADDY_IMG" ./caddy

echo -e "${GREEN}✅ 镜像构建完成${NC}"

# 3. 启动服务
echo -e "${BLUE}🚀 启动生产即 Docker 环境...${NC}"

# 停止旧容器 (包括可能由 docker-compose.yml 启动的)
docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
# 为了兼容性，也可以尝试 down 默认的 compose
docker compose -f "$PROJECT_ROOT/docker-compose.yml" down --remove-orphans 2>/dev/null || true

# 启动！
echo -e "${GREEN}🌐 服务启动中... 访问 http://localhost 即可${NC}"
# 直接使用新文件，它会自己读取 .env.prod.local
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up


