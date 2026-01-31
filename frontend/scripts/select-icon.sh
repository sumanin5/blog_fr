#!/bin/bash

# 图标选择脚本
# 使用方法：./scripts/select-icon.sh notebook

echo "════════════════════════════════════════════════════════════════"
echo "                    博客图标选择工具                              "
echo "════════════════════════════════════════════════════════════════"
echo ""

# 可用的图标
declare -A icons
icons[notebook]="笔记本（青蓝色）- 内容创作"
icons[book]="书本（绿青色）- 知识分享"
icons[feather]="羽毛笔（紫粉色）- 写作主题"
icons[code]="代码（橙红色）- 技术博客"
icons[rocket]="火箭（蓝紫色）- 现代快速"
icons[letter]="字母 B（蓝紫色）- 简约专业"

# 如果没有参数，显示帮助
if [ -z "$1" ]; then
  echo "可用的图标："
  echo ""
  for key in "${!icons[@]}"; do
    echo "  $key - ${icons[$key]}"
  done
  echo ""
  echo "使用方法："
  echo "  ./scripts/select-icon.sh notebook"
  echo "  ./scripts/select-icon.sh book"
  echo "  ./scripts/select-icon.sh code"
  echo ""
  exit 0
fi

ICON_NAME=$1

# 检查图标是否存在
if [ -z "${icons[$ICON_NAME]}" ]; then
  echo "❌ 错误：未知的图标名称 '$ICON_NAME'"
  echo ""
  echo "可用的图标："
  for key in "${!icons[@]}"; do
    echo "  $key - ${icons[$key]}"
  done
  exit 1
fi

# 设置文件路径
if [ "$ICON_NAME" = "letter" ]; then
  # 字母 B 图标已经是默认的
  echo "✓ 使用默认的字母 B 图标"
  echo ""
  echo "如果你之前修改过，可以恢复默认："
  echo "  git checkout src/app/icon.svg"
  exit 0
fi

SOURCE_FILE="public/icon-${ICON_NAME}.svg"
TARGET_FILE="src/app/icon.svg"

# 检查源文件是否存在
if [ ! -f "$SOURCE_FILE" ]; then
  echo "❌ 错误：找不到文件 $SOURCE_FILE"
  exit 1
fi

# 备份当前图标
if [ -f "$TARGET_FILE" ]; then
  cp "$TARGET_FILE" "$TARGET_FILE.backup"
  echo "✓ 已备份当前图标到 $TARGET_FILE.backup"
fi

# 复制新图标
cp "$SOURCE_FILE" "$TARGET_FILE"

echo "✓ 已应用图标：${icons[$ICON_NAME]}"
echo ""
echo "下一步："
echo "  1. 重启开发服务器（如果正在运行）"
echo "  2. 强制刷新浏览器：Ctrl+Shift+R (Windows/Linux) 或 Cmd+Shift+R (Mac)"
echo ""
echo "如果要恢复之前的图标："
echo "  cp $TARGET_FILE.backup $TARGET_FILE"
echo ""
echo "════════════════════════════════════════════════════════════════"
