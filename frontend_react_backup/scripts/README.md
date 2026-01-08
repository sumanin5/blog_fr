# 脚本工具

本目录包含项目的各种脚本工具。

## 📜 可用脚本

### 🎨 install-fonts.sh

**用途：** 安装本地化字体包

**使用方法：**

```bash
# 在 frontend 目录下执行
bash scripts/install-fonts.sh

# 或者从项目根目录执行
cd frontend && bash scripts/install-fonts.sh
```

**功能：**

- 安装 `@fontsource/inter` 字体包
- 字体会被打包到应用中，不依赖外部 CDN
- 适合在中国大陆部署的项目

**相关文档：**

- [字体设置指南](../docs/setup/fonts.md)

---

## 🔧 脚本开发规范

### 文件命名

- 使用小写字母和连字符
- 扩展名：`.sh` (Bash) 或 `.js` (Node.js)
- 示例：`install-fonts.sh`, `generate-api.js`

### 脚本结构

```bash
#!/bin/bash

# ============================================
# 脚本标题
# ============================================
# 用途：简短描述
# 使用：bash scripts/script-name.sh
# ============================================

set -e  # 遇到错误立即退出

# 脚本内容...
```

### 错误处理

- 使用 `set -e` 确保错误时退出
- 提供清晰的错误信息
- 使用 emoji 增强可读性

### 文档

- 在脚本顶部添加注释说明
- 在本 README 中添加使用说明
- 提供示例命令

---

## 📝 添加新脚本

1. 在 `scripts/` 目录创建脚本文件
2. 添加执行权限：`chmod +x scripts/your-script.sh`
3. 在本 README 中添加说明
4. 提交到 Git

---

## 🤝 贡献

欢迎贡献新的脚本工具！请确保：

- 脚本有清晰的注释
- 提供使用文档
- 遵循命名规范
