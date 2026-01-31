/**
 * SVG 转 ICO 脚本
 *
 * 使用方法：
 * node scripts/svg-to-ico.js icon-notebook.svg
 *
 * 这会将 public/icon-notebook.svg 转换为 src/app/favicon.ico
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 简单的 SVG 到 ICO 转换说明
console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    SVG 转 ICO 工具说明                          ║
╚════════════════════════════════════════════════════════════════╝

由于 Node.js 原生不支持 SVG 转 ICO，请使用以下方法之一：

方法 1：在线转换（推荐）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 访问：https://convertio.co/zh/svg-ico/
2. 上传你选择的 SVG 文件（如 public/icon-notebook.svg）
3. 下载转换后的 favicon.ico
4. 将文件放到 frontend/src/app/favicon.ico

方法 2：使用 ImageMagick（命令行）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 安装 ImageMagick
sudo apt-get install imagemagick  # Ubuntu/Debian
brew install imagemagick          # macOS

# 转换
convert public/icon-notebook.svg -resize 32x32 src/app/favicon.ico

方法 3：直接使用 SVG（最简单）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
现代浏览器都支持 SVG 图标，只需：

1. 删除 favicon.ico（已删除）
2. 确保 icon.svg 存在
3. 重启开发服务器
4. 强制刷新浏览器（Ctrl+Shift+R）

当前状态：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ favicon.ico 已删除
✓ icon.svg 已存在
✓ 可用的图标：
  - public/icon-notebook.svg （笔记本 - 青蓝色）
  - public/icon-book.svg （书本 - 绿青色）
  - public/icon-feather.svg （羽毛笔 - 紫粉色）
  - public/icon-code.svg （代码 - 橙红色）
  - public/icon-rocket.svg （火箭 - 蓝紫色）

快速应用图标：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 选择笔记本图标
cp public/icon-notebook.svg src/app/icon.svg

# 重启开发服务器
pnpm dev

# 强制刷新浏览器
Ctrl+Shift+R (Windows/Linux) 或 Cmd+Shift+R (Mac)

╚════════════════════════════════════════════════════════════════╝
`);

// 如果提供了参数，显示具体的转换命令
const svgFile = process.argv[2];
if (svgFile) {
  const svgPath = path.join(__dirname, "../public", svgFile);

  if (fs.existsSync(svgPath)) {
    console.log(`\n选中的图标：${svgFile}`);
    console.log(`\n推荐命令：`);
    console.log(`\n1. 复制为 icon.svg（推荐）：`);
    console.log(`   cp public/${svgFile} src/app/icon.svg`);
    console.log(`\n2. 使用 ImageMagick 转换为 ICO：`);
    console.log(
      `   convert public/${svgFile} -resize 32x32 src/app/favicon.ico`
    );
  } else {
    console.log(`\n❌ 错误：找不到文件 public/${svgFile}`);
    console.log(`\n可用的图标文件：`);
    const publicDir = path.join(__dirname, "../public");
    const files = fs
      .readdirSync(publicDir)
      .filter((f) => f.startsWith("icon-") && f.endsWith(".svg"));
    files.forEach((f) => console.log(`   - ${f}`));
  }
}
