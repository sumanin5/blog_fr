# 组件更新策略

## 🎯 shadcn/ui 组件管理策略

### 更新安全的组件类别

#### ✅ 可以安全更新的组件

- **原子组件**: Button, Input, Label, Card 等
- **布局组件**: Container, Grid, Flex 等
- **反馈组件**: Alert, Toast, Dialog 等

这些组件通常只涉及样式和基础功能，更新风险较低。

#### ⚠️ 需要谨慎更新的组件

- **表单组件**: Form, FormField 等
- **数据展示**: Table, DataTable 等
- **复杂交互**: Select, Combobox 等

这些组件可能涉及 API 变更，需要测试后更新。

#### 🚫 建议锁定版本的组件

- **高度定制的组件**: 已经大量修改的组件
- **关键业务组件**: 登录表单、支付组件等
- **集成复杂的组件**: 与第三方库深度集成的组件

### 更新流程

#### 1. 版本控制策略

```json
// package.json
{
  "dependencies": {
    // 锁定关键组件版本
    "@radix-ui/react-form": "0.0.3",
    // 允许小版本更新
    "@radix-ui/react-button": "^1.0.0"
  }
}
```

#### 2. 分批更新流程

1. **测试环境验证**: 先在测试环境更新
2. **回归测试**: 运行完整的测试套件
3. **渐进式部署**: 逐步推广到生产环境
4. **回滚准备**: 保持快速回滚能力

#### 3. 自定义组件保护

```typescript
// 创建自己的组件版本，不直接依赖 shadcn
export { Button as ShadcnButton } from "@/components/ui/button";

// 封装自己的版本
export function AppButton(props: ButtonProps) {
  return <ShadcnButton {...props} />;
}
```

### 定制化层级

#### Level 1: 主题定制 (推荐)

```css
/* 通过 CSS 变量定制 */
:root {
  --primary: 220 14.3% 95.9%;
  --primary-foreground: 220.9 39.3% 11%;
}
```

#### Level 2: 组合定制 (推荐)

```typescript
// 通过组合创建新组件
export function SearchForm() {
  return (
    <div className="flex gap-2">
      <Input placeholder="搜索..." />
      <Button>搜索</Button>
    </div>
  );
}
```

#### Level 3: 扩展定制 (谨慎)

```typescript
// 扩展现有组件
export function EnhancedButton({ icon, ...props }: EnhancedButtonProps) {
  return (
    <Button {...props}>
      {icon && <span className="mr-2">{icon}</span>}
      {props.children}
    </Button>
  );
}
```

#### Level 4: 源码修改 (不推荐)

```typescript
// 直接修改 shadcn 组件源码
// ❌ 这种方式会在更新时丢失修改
```

### 推荐的项目结构

```
src/
├── components/
│   ├── ui/                 # shadcn 原始组件 (可更新)
│   ├── forms/             # 表单相关封装 (自维护)
│   ├── business/          # 业务组件 (自维护)
│   └── app/               # 应用级组件 (自维护)
├── lib/
│   ├── utils.ts           # shadcn 工具函数
│   └── form-utils.ts      # 自定义表单工具
└── styles/
    ├── globals.css        # 全局样式
    └── components.css     # 组件样式覆盖
```

## 🎯 总结建议

1. **优先使用封装层**: 不直接修改 shadcn 源码
2. **版本锁定策略**: 关键组件锁定版本，基础组件允许更新
3. **渐进式定制**: 从主题开始，逐步到组合，避免源码修改
4. **测试驱动更新**: 每次更新都要有完整的测试覆盖
5. **文档化定制**: 记录所有定制内容和原因
