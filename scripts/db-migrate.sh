#!/bin/bash

# ==========================================
# 数据库迁移脚本
# ==========================================
# 用途：生成和执行 Alembic 数据库迁移
# 使用：
#   ./scripts/db-migrate.sh generate "Add new model"  # 生成迁移文件
#   ./scripts/db-migrate.sh upgrade                   # 执行迁移
#   ./scripts/db-migrate.sh status                    # 查看迁移状态

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ 错误：请提供操作类型${NC}"
    echo "用法："
    echo "  $0 generate \"迁移描述\"  # 生成迁移文件"
    echo "  $0 upgrade              # 执行迁移"
    echo "  $0 status               # 查看迁移状态"
    echo "  $0 history              # 查看迁移历史"
    echo "  $0 downgrade <revision> # 回滚到指定版本"
    exit 1
fi

COMMAND=$1
BACKEND_CONTAINER="blog_fr-backend-1"

# 检查后端容器是否运行
check_container() {
    if ! docker ps --format "table {{.Names}}" | grep -q "^${BACKEND_CONTAINER}$"; then
        echo -e "${YELLOW}⚠️  后端容器未运行，正在启动...${NC}"
        docker compose -f docker-compose.dev.yml up -d backend
        echo -e "${BLUE}⏳ 等待容器启动...${NC}"
        sleep 5
    fi
}

# 执行 Alembic 命令
run_alembic() {
    local cmd="$1"
    echo -e "${BLUE}🔄 执行: alembic $cmd${NC}"
    docker exec -it "$BACKEND_CONTAINER" bash -c "alembic $cmd"
}

case "$COMMAND" in
    "generate")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ 错误：请提供迁移描述${NC}"
            echo "用法: $0 generate \"Add MediaFile model\""
            exit 1
        fi

        check_container
        echo -e "${YELLOW}📝 生成迁移文件: $2${NC}"
        run_alembic "revision --autogenerate -m '$2'"
        echo -e "${GREEN}✅ 迁移文件生成完成！${NC}"
        echo -e "${BLUE}💡 请检查生成的迁移文件，然后运行: $0 upgrade${NC}"
        ;;

    "upgrade")
        check_container
        echo -e "${YELLOW}⬆️  执行数据库迁移...${NC}"
        run_alembic "upgrade head"
        echo -e "${GREEN}✅ 数据库迁移完成！${NC}"
        ;;

    "status")
        check_container
        echo -e "${BLUE}📊 当前迁移状态:${NC}"
        run_alembic "current"
        ;;

    "history")
        check_container
        echo -e "${BLUE}📚 迁移历史:${NC}"
        run_alembic "history"
        ;;

    "downgrade")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ 错误：请提供目标版本${NC}"
            echo "用法: $0 downgrade <revision>"
            echo "提示: 使用 '$0 history' 查看可用版本"
            exit 1
        fi

        check_container
        echo -e "${YELLOW}⬇️  回滚到版本: $2${NC}"
        echo -e "${RED}⚠️  警告：这将回滚数据库结构，可能丢失数据！${NC}"
        read -p "确认继续？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            run_alembic "downgrade $2"
            echo -e "${GREEN}✅ 数据库回滚完成！${NC}"
        else
            echo -e "${BLUE}❌ 操作已取消${NC}"
        fi
        ;;

    *)
        echo -e "${RED}❌ 未知命令: $COMMAND${NC}"
        echo "支持的命令: generate, upgrade, status, history, downgrade"
        exit 1
        ;;
esac
