#!/bin/bash

# ==========================================
# Docker 完全重建脚本
# ==========================================
# 用途：在添加新依赖或修改 Dockerfile 后，完全无缓存重建容器
# 使用：
#   ./scripts/docker-rebuild.sh backend   # 重建后端
#   ./scripts/docker-rebuild.sh frontend  # 重建前端
#   ./scripts/docker-rebuild.sh all       # 重建全部
#   ./scripts/docker-rebuild.sh           # 交互式选择

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录（脚本所在目录的上一级）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Docker Compose 配置文件
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dev.yml"

# ==========================================
# 辅助函数
# ==========================================

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

# 检查 Docker 是否运行
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker 未运行，请先启动 Docker"
        exit 1
    fi
    print_success "Docker 运行正常"
}

# 检查 docker-compose 文件是否存在
check_compose_file() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "未找到 docker-compose.dev.yml 文件"
        print_info "当前路径: $PROJECT_ROOT"
        exit 1
    fi
    print_success "找到配置文件: docker-compose.dev.yml"
}

# 停止并删除容器
stop_and_remove_containers() {
    local service=$1
    print_step "停止并删除 $service 容器..."

    if [ "$service" == "all" ]; then
        docker compose -f "$COMPOSE_FILE" down
        print_success "所有容器已停止并删除"
    else
        # 尝试停止容器
        docker compose -f "$COMPOSE_FILE" stop "$service" 2>/dev/null || true
        # 尝试删除容器
        docker compose -f "$COMPOSE_FILE" rm -f "$service" 2>/dev/null || true
        print_success "$service 容器已停止并删除"
    fi
}

# 删除镜像（可选，节省空间）
remove_images() {
    local service=$1
    print_step "删除旧镜像（可选）..."

    if [ "$service" == "all" ]; then
        docker compose -f "$COMPOSE_FILE" down --rmi local 2>/dev/null || true
    else
        # 获取镜像名称
        local image_name=$(docker compose -f "$COMPOSE_FILE" images -q "$service" 2>/dev/null | head -n 1)
        if [ -n "$image_name" ]; then
            docker rmi "$image_name" 2>/dev/null || true
            print_success "旧镜像已删除"
        else
            print_info "未找到旧镜像，跳过删除"
        fi
    fi
}

# 无缓存重建
rebuild_service() {
    local service=$1
    print_step "开始无缓存重建 $service..."

    if [ "$service" == "all" ]; then
        print_info "重建所有服务..."
        docker compose -f "$COMPOSE_FILE" build --no-cache
    else
        docker compose -f "$COMPOSE_FILE" build --no-cache "$service"
    fi

    if [ $? -eq 0 ]; then
        print_success "$service 重建成功！"
    else
        print_error "$service 重建失败"
        exit 1
    fi
}

# 启动服务
start_service() {
    local service=$1
    print_step "启动服务..."

    if [ "$service" == "all" ]; then
        docker compose -f "$COMPOSE_FILE" up -d
        print_success "所有服务已启动"
    else
        docker compose -f "$COMPOSE_FILE" up -d "$service"
        print_success "$service 服务已启动"
    fi
}

# 显示服务状态
show_status() {
    print_step "当前服务状态："
    docker compose -f "$COMPOSE_FILE" ps
}

# 交互式选择
interactive_select() {
    # 输出到 stderr，避免被捕获
    echo "" >&2
    echo "========================================" >&2
    echo "请选择要重建的服务：" >&2
    echo "========================================" >&2
    echo "  1) backend  (后端)" >&2
    echo "  2) frontend (前端)" >&2
    echo "  3) all      (全部)" >&2
    echo "  4) 取消" >&2
    echo "========================================" >&2
    echo -n "请输入选项 [1-4]: " >&2
    read choice

    case $choice in
        1) echo "backend" ;;  # 只有这个输出到 stdout
        2) echo "frontend" ;;
        3) echo "all" ;;
        4)
            print_info "操作已取消"
            exit 0
            ;;
        *)
            print_error "无效选项"
            exit 1
            ;;
    esac
}

# 确认操作
confirm_rebuild() {
    local service=$1
    echo ""
    print_warning "即将完全无缓存重建: $service"
    print_warning "此操作将："
    echo "  1. 停止并删除现有容器"
    echo "  2. 删除旧镜像（可选）"
    echo "  3. 完全无缓存重建镜像"
    echo "  4. 启动新容器"
    echo ""
    read -p "确认继续？(y/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "操作已取消"
        exit 0
    fi
}

# ==========================================
# 主流程
# ==========================================

main() {
    # 切换到项目根目录
    cd "$PROJECT_ROOT"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}   Docker 完全重建脚本${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""

    # 检查环境
    check_docker
    check_compose_file

    # 确定要重建的服务
    local service=""
    if [ -z "$1" ]; then
        # 无参数，交互式选择
        service=$(interactive_select)
    else
        # 从参数获取
        service="$1"

        # 验证参数
        if [[ ! "$service" =~ ^(backend|frontend|all)$ ]]; then
            print_error "无效的服务名称: $service"
            print_info "有效选项: backend, frontend, all"
            exit 1
        fi
    fi

    # 确认操作
    confirm_rebuild "$service"

    echo ""
    print_step "开始重建流程..."
    echo ""

    # 步骤 1: 停止并删除容器
    stop_and_remove_containers "$service"
    echo ""

    # 步骤 2: 删除旧镜像（可选）
    read -p "是否删除旧镜像以节省空间？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        remove_images "$service"
    else
        print_info "跳过删除镜像"
    fi
    echo ""

    # 步骤 3: 无缓存重建
    rebuild_service "$service"
    echo ""

    # 步骤 4: 启动服务
    start_service "$service"
    echo ""

    # 步骤 5: 显示状态
    show_status
    echo ""

    # 完成提示
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    print_success "重建完成！"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""

    # 根据服务类型给出访问提示
    case $service in
        backend)
            print_info "后端服务访问地址："
            echo "  • API 文档 (Swagger): http://localhost:8000/docs"
            echo "  • API 文档 (Scalar):  http://localhost:8000/scalar"
            echo "  • API 文档 (ReDoc):   http://localhost:8000/redoc"
            ;;
        frontend)
            print_info "前端服务访问地址："
            echo "  • 开发服务器: http://localhost:5173"
            ;;
        all)
            print_info "服务访问地址："
            echo "  • 前端: http://localhost:5173"
            echo "  • 后端 API: http://localhost:8000/docs"
            echo "  • Scalar 文档: http://localhost:8000/scalar"
            ;;
    esac

    echo ""
    print_info "查看日志: docker compose -f docker-compose.dev.yml logs -f $service"
    echo ""
}

# 运行主函数
main "$@"
