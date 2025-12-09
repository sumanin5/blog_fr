# 快速开始指南

## 🚀 5 分钟上手

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 安装字体（推荐）

```bash
bash scripts/install-fonts.sh
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问：http://localhost:5173

---

## 📚 常用命令

### 开发

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run lint         # 代码检查
```

### Docker

```bash
# 开发环境（支持热重载）
docker compose -f docker-compose.dev.yml up

# 生产环境
docker compose up

# ⚠️ 添加新 npm 包后需要重新构建
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml build --no-cache frontend
docker compose -f docker-compose.dev.yml up
```

**注意**：如果遇到 `Failed to resolve import` 错误，说明容器中的依赖没有更新，请执行上面的重新构建命令。详见 [Docker 故障排查](./docs/docker/troubleshooting.md)。

---

## 📖 文档导航

### 核心文档

- [项目结构说明](./PROJECT_STRUCTURE.md) - 了解项目组织
- [文档索引](./docs/README.md) - 所有文档的入口

### 设置指南

- [字体配置](./docs/setup/fonts.md) - 本地化字体设置

### 工具脚本

- [脚本说明](./scripts/README.md) - 可用的脚本工具

---

## 🎨 主题系统

### 切换主题

项目支持 3 种主题模式：

- **dark** - 深色模式
- **light** - 浅色模式
- **system** - 跟随系统

### 使用方式

```tsx
import { useTheme } from "@/contexts/ThemeContext";

function MyComponent() {
  const { theme, setTheme } = useTheme();

  return <button onClick={() => setTheme("dark")}>切换到深色模式</button>;
}
```

---

## 🔧 配置文件

### 重要配置

- `vite.config.ts` - Vite 构建配置
- `tsconfig.json` - TypeScript 配置
- `components.json` - shadcn/ui 组件配置
- `.env.example` - 环境变量模板

### 环境变量

复制 `.env.example` 为 `.env` 并修改：

```bash
cp .env.example .env
```

---

## 🐛 常见问题

### 字体加载失败

**问题：** 页面显示默认字体，不是 Inter

**解决：**

```bash
# 安装字体包
npm install @fontsource/inter

# 或使用脚本
bash scripts/install-fonts.sh
```

### 端口被占用

**问题：** `Error: Port 5173 is already in use`

**解决：**

```bash
# 方法 1：修改端口
npm run dev -- --port 3000

# 方法 2：杀死占用进程
lsof -ti:5173 | xargs kill -9
```

### 构建失败

**问题：** `npm run build` 报错

**解决：**

```bash
# 清理缓存
rm -rf node_modules dist
npm install
npm run build
```

---

## 📦 项目结构速览

```
frontend/
├── docs/          # 📚 文档
├── scripts/       # 🔧 脚本
├── src/           # 💻 源代码
│   ├── api/       # API 客户端
│   ├── components/# React 组件
│   ├── contexts/  # Context 提供者
│   └── pages/     # 页面组件
├── public/        # 静态资源
└── templates/     # 模板文件
```

---

## 🤝 获取帮助

### 文档

- [完整文档](./docs/README.md)
- [项目结构](./PROJECT_STRUCTURE.md)

### 问题反馈

如果遇到问题，请：

1. 查看相关文档
2. 检查常见问题
3. 提交 Issue

---

## ✅ 下一步

- [ ] 阅读 [项目结构说明](./PROJECT_STRUCTURE.md)
- [ ] 了解 [主题系统](./src/contexts/ThemeContext.tsx)
- [ ] 查看 [API 文档](./docs/api/)
- [ ] 开始开发！

---

**祝你开发愉快！** 🎉
