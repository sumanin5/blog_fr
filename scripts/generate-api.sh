#!/bin/bash

# ============================================================
# API 代码生成脚本
# ============================================================
#
# 这个脚本自动化完成以下步骤：
# 1. 从后端导出 OpenAPI 规范
# 2. 生成前端 TypeScript 代码
# 3. 恢复手动配置的 config.ts 文件
#
# 使用方法：
#   在项目根目录运行：./scripts/generate-api.sh
#
# ============================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录的上级目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🚀 API 代码生成脚本${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# ============================================================
# 步骤 1: 导出 OpenAPI 规范
# ============================================================
echo -e "${YELLOW}📋 步骤 1: 导出 OpenAPI 规范...${NC}"
cd "$PROJECT_ROOT/backend"

if command -v uv &> /dev/null; then
    uv run python scripts/export_openapi.py
else
    python scripts/export_openapi.py
fi

echo -e "${GREEN}   ✅ OpenAPI 规范导出成功${NC}"
echo ""

# ============================================================
# 步骤 2: 生成前端 TypeScript 代码
# ============================================================
echo -e "${YELLOW}🔧 步骤 2: 生成前端 TypeScript 代码...${NC}"
cd "$PROJECT_ROOT/frontend"

npm run api:generate

echo -e "${GREEN}   ✅ TypeScript 代码生成成功${NC}"
echo ""

# ============================================================
# 步骤 3: 恢复 config.ts 配置文件
# ============================================================
echo -e "${YELLOW}📝 步骤 3: 恢复 config.ts 配置文件...${NC}"

TEMPLATE_FILE="$PROJECT_ROOT/frontend/templates/api-config.ts"
TARGET_FILE="$PROJECT_ROOT/frontend/src/api/config.ts"

if [ -f "$TEMPLATE_FILE" ]; then
    cp "$TEMPLATE_FILE" "$TARGET_FILE"
    echo -e "${GREEN}   ✅ config.ts 已恢复${NC}"
else
    echo -e "${RED}   ❌ 模板文件不存在: $TEMPLATE_FILE${NC}"
    echo -e "${RED}   请手动创建 config.ts 文件${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}🎉 API 代码生成完成！${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "生成的文件位于: ${BLUE}frontend/src/api/${NC}"
echo -e "  - sdk.gen.ts     (API 函数)"
echo -e "  - types.gen.ts   (TypeScript 类型)"
echo -e "  - config.ts      (客户端配置)"
echo ""
