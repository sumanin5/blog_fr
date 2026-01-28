# 🎨 Blog FR - Frontend

基于 **Next.js 16 (App Router)** 和 **React 19** 构建的现代博客前端。

---

## ✨ 核心特性

- ⚡ **混合渲染**: SSR 用于内容页面 (SEO 优化)，CSR 用于管理后台 (交互流畅)
- 🎨 **现代 UI**: Tailwind CSS 4 + shadcn/ui，支持深色/浅色模式切换
- 📝 **MDX 渲染**: 支持 Mermaid 图表、代码高亮、KaTeX 数学公式
- 🔗 **类型安全**: 基于 OpenAPI 自动生成的 TypeScript SDK
- 🔄 **状态管理**: TanStack Query v5 + React Context

---

## 🛠️ 技术栈

| 技术               | 说明                        |
| ------------------ | --------------------------- |
| Next.js 16         | React 全栈框架 (App Router) |
| React 19           | UI 库                       |
| TypeScript         | 类型系统                    |
| Tailwind CSS 4     | 原子化 CSS 框架             |
| shadcn/ui          | 可定制组件库                |
| TanStack Query     | 服务端状态管理              |
| hey-api/openapi-ts | API SDK 自动生成            |
| next-themes        | 主题切换                    |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

主要配置项：

- `NEXT_PUBLIC_API_URL`: 后端 API 地址 (浏览器端)
- `BACKEND_INTERNAL_URL`: 后端 API 地址 (服务器端，用于 SSR)

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 📦 常用命令

| 命令                | 说明                           |
| ------------------- | ------------------------------ |
| `pnpm dev`          | 启动开发服务器 (含热更新)      |
| `pnpm build`        | 构建生产版本                   |
| `pnpm start`        | 启动生产服务器                 |
| `pnpm lint`         | ESLint 代码检查                |
| `pnpm api:generate` | 从 OpenAPI 生成 TypeScript SDK |

---

## 🗂️ 项目结构

```text
frontend/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── (public)/           # 公开页面 (博客、分类等)
│   │   └── (admin)/            # 管理后台 (需登录)
│   ├── components/             # React 组件
│   │   ├── ui/                 # shadcn/ui 基础组件
│   │   ├── home/               # 首页组件 (轮播图、最新文章)
│   │   ├── admin/              # 管理后台专用组件
│   │   └── ...
│   ├── hooks/                  # 自定义 Hooks
│   │   ├── admin/              # 管理后台 Hooks (CRUD 操作)
│   │   └── ...                 # 公共 Hooks
│   ├── shared/api/             # API 层
│   │   ├── generated/          # 自动生成的 SDK
│   │   ├── types.ts            # 领域模型类型定义
│   │   └── transformers.ts     # snake_case ↔ camelCase 转换
│   ├── lib/                    # 工具函数
│   └── config/                 # 配置文件
├── public/                     # 静态资源
├── scripts/                    # 脚本工具
│   └── generate-api.sh         # API SDK 生成脚本
└── package.json
```

---

## 🔗 API SDK 生成

项目使用 `@hey-api/openapi-ts` 从后端 OpenAPI 规范自动生成类型安全的 SDK。

```bash
# 后端 API 变更后，运行此命令更新前端类型
pnpm api:generate

# 或使用脚本
./scripts/generate-api.sh
```

生成的代码位于 `src/shared/api/generated/`。

---

## 🎨 UI 开发

### 添加 shadcn/ui 组件

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
```

### 主题切换

项目使用 `next-themes` 实现深色/浅色模式：

```tsx
import { useTheme } from "next-themes";

const { theme, setTheme } = useTheme();
setTheme("dark"); // 或 "light" 或 "system"
```

---

## 📚 相关文档

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [TanStack Query 文档](https://tanstack.com/query)

---

## 📄 许可证

MIT
