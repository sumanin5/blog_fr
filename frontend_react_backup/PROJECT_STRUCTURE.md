# 项目结构说明

## 新的 Feature-First 架构（扁平化版本）

本项目采用现代的 Feature-First 架构，但避免过度的目录嵌套，将相关功能组织在一起，提高代码的可维护性和可扩展性。

```
src/
├── app/                    # 应用级配置
│   ├── providers/         # 全局 Provider 组件
│   │   ├── QueryProvider.tsx
│   │   └── index.tsx
│   ├── routes/            # 路由配置
│   │   ├── Auth/
│   │   ├── Blog/
│   │   ├── Dashboard/
│   │   ├── MDX/
│   │   └── index.tsx
│   └── store/             # 全局状态管理（如需要）
├── shared/                # 跨功能共享资源
│   ├── api/               # API 客户端配置
│   │   ├── generated/     # hey-api 自动生成的文件
│   │   │   ├── client.gen.ts
│   │   │   ├── sdk.gen.ts
│   │   │   ├── types.gen.ts
│   │   │   └── index.ts
│   │   ├── config.ts      # API 客户端配置（手动维护）
│   │   └── index.ts       # 统一导出
│   ├── components/        # 通用 UI 组件
│   │   ├── ui/           # shadcn/ui 组件
│   │   ├── common/       # 通用业务组件
│   │   ├── forms/        # 表单组件
│   │   ├── layout/       # 布局组件
│   │   └── mdx/          # MDX 渲染组件
│   ├── hooks/             # 通用 hooks
│   ├── lib/               # 工具函数、配置
│   │   ├── utils.ts      # 通用工具函数
│   │   ├── query-client.ts   # TanStack Query 配置
│   │   ├── query-key-factory.ts  # 查询键管理
│   │   └── validations/  # 表单验证规则
│   ├── types/             # 全局类型定义
│   └── constants/         # 常量定义
├── features/              # 业务功能模块（扁平化）
│   ├── auth/              # 认证功能
│   │   ├── AuthContext.tsx    # 认证上下文（组件）
│   │   ├── useAuth.ts         # 认证 Hook
│   │   ├── useAuthQueries.ts  # Query/Mutation Hooks
│   │   ├── auth-api.ts        # API 调用
│   │   ├── query-keys.ts      # 查询键定义
│   │   └── index.ts           # 统一导出
│   ├── blog/              # 博客功能
│   │   ├── components/    # 博客专用组件
│   │   ├── lib/           # 博客相关工具
│   │   └── index.ts
│   ├── mdx/               # MDX 功能
│   │   ├── components/
│   │   ├── lib/
│   │   └── index.ts
│   └── theme/             # 主题功能
│       ├── components/
│       ├── hooks/
│       ├── providers/
│       └── index.ts
└── pages/                 # 路由页面入口（唯一的页面目录）
    ├── auth/
    │   ├── Login.tsx
    │   └── Register.tsx
    ├── blog/
    │   ├── BlogList.tsx
    │   └── BlogDetail.tsx
    ├── dashboard/
    │   └── Dashboard.tsx
    ├── sandbox/           # 测试/演示页面
    │   ├── CardTest.tsx
    │   ├── MDXExample.tsx
    │   └── TestHighlight.tsx
    ├── About.tsx
    ├── HomePage.tsx
    └── NotFound.tsx
```

## 架构优势

### 1. 高内聚，低耦合

- 每个功能模块的所有相关代码都在一起
- 功能之间的依赖关系清晰明确
- 修改某个功能时，只需要关注对应的 feature 目录

### 2. 易于维护和扩展

- 新增功能时，创建新的 feature 目录即可
- 删除功能时，直接删除对应的 feature 目录
- 代码组织清晰，便于团队协作

### 3. 扁平化结构的优势

- **避免目录套娃**：小功能不需要强行创建多层文件夹
- **快速定位**：文件位置一目了然，减少跳转次数
- **灵活性**：当功能变复杂时再创建子目录，而不是一开始就创建
- **清晰的页面归属**：所有页面统一在 `src/pages` 下，路由配置更直观

### 4. 更好的开发体验

- TypeScript 类型推导更准确
- IDE 智能提示更精确
- 代码导航更便捷
- 测试文件集中在 `sandbox` 目录，不干扰主代码

## 工具配置

### shadcn/ui 配置

- 组件安装路径：`@/shared/components`
- UI 组件路径：`@/shared/components/ui`
- 工具函数路径：`@/shared/lib/utils`

### hey-api 配置

- 生成目录：`./src/shared/api/generated`
- 配置文件：`./src/shared/api/config.ts`
- 统一导出：`./src/shared/api/index.ts`

### TanStack Query

- 客户端配置：`@/shared/lib/query-client`
- 查询键管理：`@/shared/lib/query-keys`
- Provider 配置：`@/app/providers/QueryProvider`

## 使用指南

### 1. 添加新功能

```bash
# 创建新功能目录
mkdir -p src/features/new-feature/{api,components,hooks,pages,store,types}

# 创建导出文件
touch src/features/new-feature/index.ts
```

### 2. 安装 shadcn/ui 组件

```bash
npx shadcn@latest add button
# 组件会自动安装到 src/shared/components/ui/
```

### 3. 生成 API 代码

```bash
# 运行生成脚本
./scripts/generate-api.sh

# 或者直接运行
pnpm api:generate
```

### 4. 导入规则

```typescript
// 导入共享组件
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

// 导入功能模块
import { useAuth } from "@/features/auth";
import { useBlogPosts } from "@/features/blog";

// 导入 API
import { getCurrentUserInfo } from "@/shared/api";
```

## 迁移指南

如果需要从旧结构迁移到新结构，请按照以下顺序：

1. **移动共享资源**

   ```bash
   mv lib/utils.ts shared/lib/
   mv components/ui shared/components/
   ```

2. **移动功能模块**

   ```bash
   mv pages/auth features/auth/pages/
   mv contexts/AuthContext.tsx features/auth/store/
   ```

3. **更新导入路径**
   - 使用 IDE 的全局替换功能
   - 或者使用 codemod 工具自动化迁移

## 最佳实践

1. **功能模块内聚**：相关的组件、hooks、API 调用都放在同一个 feature 目录下
2. **共享资源复用**：通用的组件、工具函数放在 shared 目录下
3. **类型安全**：充分利用 TypeScript 的类型系统
4. **一致的导出**：每个 feature 都有 index.ts 文件统一导出
5. **清晰的命名**：文件和目录命名要清晰明确
