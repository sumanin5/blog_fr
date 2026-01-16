# 开发环境缓存策略

## 问题背景

Next.js 的缓存机制在生产环境非常有用，但在开发环境可能导致：

- 数据更新后看不到变化
- 需要频繁清除 `.next` 目录
- 调试困难

## 解决方案

### 采用的策略：根据环境动态设置缓存

```typescript
const res = await fetch(url, {
  next: {
    // 开发环境禁用缓存，生产环境 1 小时缓存
    revalidate: process.env.NODE_ENV === "development" ? 0 : 3600,
    tags: ["posts", `post-${slug}`],
  },
});
```

## 为什么推荐这种方案？

### ✅ 优点

1. **开发体验好**

   - 每次刷新都能看到最新数据
   - 不需要手动清除缓存
   - 调试更直观

2. **生产环境性能好**

   - 保留了缓存优化
   - 减少服务器负载
   - 提升用户体验

3. **灵活性高**
   - 可以通过环境变量控制
   - 不同环境不同策略
   - 易于调整

### ⚠️ 注意事项

1. **开发环境性能**

   - 每次请求都会调用后端 API
   - 页面加载可能稍慢
   - 但这是可接受的权衡

2. **React Cache 仍然生效**
   - `cache()` 包裹的函数在同一次渲染中仍会去重
   - 避免重复请求
   - 这是好事！

## 其他方案对比

### 方案 2：完全禁用缓存（不推荐）

```typescript
// next.config.ts
export default {
  experimental: {
    isrMemoryCacheSize: 0, // 禁用 ISR 缓存
  },
};
```

**缺点**：

- 影响所有页面
- 无法针对特定场景优化
- 生产环境也会受影响（如果忘记改回来）

### 方案 3：使用 `cache: 'no-store'`（不推荐）

```typescript
const res = await fetch(url, {
  cache: "no-store", // 完全禁用缓存
});
```

**缺点**：

- 无法使用 `revalidateTag()` 进行精细控制
- 生产环境也会禁用缓存
- 失去了 Next.js 缓存的所有优势

### 方案 4：使用动态路由（不推荐）

```typescript
export const dynamic = "force-dynamic";
```

**缺点**：

- 整个页面变成动态渲染
- 失去静态生成的优势
- SEO 可能受影响

## 最佳实践

### 1. 数据获取层面

```typescript
// ✅ 推荐：根据环境设置
revalidate: process.env.NODE_ENV === "development" ? 0 : 3600;

// ❌ 不推荐：硬编码
revalidate: 0; // 或 3600
```

### 2. 使用缓存标签

```typescript
tags: ["posts", `post-${slug}`];
```

这样可以在需要时精确清除特定缓存：

```typescript
// 在 API 路由中
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const { slug } = await request.json();
  revalidateTag(`post-${slug}`);
  return Response.json({ revalidated: true });
}
```

### 3. 开发时的调试技巧

如果需要临时测试缓存行为：

```bash
# 设置环境变量强制启用缓存
NODE_ENV=production pnpm dev
```

## 总结

**推荐在开发环境禁用缓存**，原因：

1. 开发效率 > 开发环境性能
2. 避免缓存导致的困惑
3. 生产环境仍保持最优性能
4. 实现简单，维护成本低

这是一个**合理的权衡**，符合"开发体验优先，生产性能优先"的原则。
