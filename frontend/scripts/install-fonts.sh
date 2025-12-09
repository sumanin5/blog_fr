#!/bin/bash

# ============================================
# 字体安装脚本
# ============================================
# 用途：安装本地化字体包
# 使用：bash scripts/install-fonts.sh
# ============================================

set -e  # 遇到错误立即退出

echo "🎨 安装字体包..."
echo ""

# 切换到 frontend 目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$FRONTEND_DIR"

echo "📦 安装 Inter 字体..."
npm install @fontsource/inter

echo ""
echo "✅ 字体安装完成！"
echo ""
echo "📝 字体已在以下文件中配置："
echo "   - src/main.tsx (导入字体)"
echo "   - src/index.css (使用字体)"
echo ""
echo "📚 查看文档："
echo "   - docs/setup/fonts.md"
echo ""
echo "🚀 运行 'npm run dev' 查看效果"
