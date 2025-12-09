#!/bin/bash

# ==========================================
# Docker 前端重建脚本
# ==========================================
# 用途：当 package.json 更新后，重新构建前端容器
# 使用：./scripts/docker-rebuild-frontend.sh

set -e  # 遇到错误立即退出

echo "🛑 停止 Docker 服务..."
docker compose -f docker-compose.dev.yml down

echo "🔨 重新构建前端镜像（不使用缓存）..."
docker compose -f docker-compose.dev.yml build --no-cache frontend

echo "🚀 启动服务..."
docker compose -f docker-compose.dev.yml up -d

echo "✅ 完成！查看日志："
echo "   docker compose -f docker-compose.dev.yml logs -f frontend"
