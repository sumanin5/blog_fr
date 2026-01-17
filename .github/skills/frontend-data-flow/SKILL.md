---
name: frontend-data-flow
description: 前端数据流与状态管理规范。涵盖 TanStack Query (React Query) 的使用模式、Query Keys 结构、API SDK 集成以及交互反馈标准。
---

## 数据获取规范 (TanStack Query)

为了保持前端状态管理的一致性和可维护性，所有异步数据操作必须遵循以下模式。

### 1. 钩子封装 (Custom Hooks)
- 所有的 `useQuery` 和 `useMutation` 必须封装在 `src/shared/hooks/` 目录下的专用文件中（如 `use-posts.ts`, `use-categories.ts`）。
- 禁止在页面组件（Page）或 UI 组件中直接编写复杂的 `queryFn` 逻辑。

### 2. 查询键管理 (Query Keys)
- 使用一致的数组格式：`['资源名', '操作/范围', ...标识符]`。
  - 例如：`['posts', 'me', postType]` (我创作的文章)
  - 例如：`['posts', 'detail', id]` (文章详情)
- 这种层次化的 Key 结构便于使用 `invalidateQueries` 进行批量刷新。

### 3. API SDK 集成
- 必须使用 `src/shared/api/generated` 中自动生成的 SDK 函数。
- 严禁使用原生的 `fetch` 或 `axios` 直接调用后端接口（SSR 场景除外，见 ARCHITECTURE.md）。
- 示例：
  ```typescript
  queryFn: () => getMyPosts({ query: { post_type: type } })
  ```

### 4. 交互与反馈标准
- **成功反馈**: 在 `Mutation` 的 `onSuccess` 回调中使用 `sonner` 库的 `toast.success()` 提供反馈。
- **错误处理**: 统一在 `onError` 中使用 `toast.error()` 展示后端返回的错误信息。
- **数据同步**: 在执行修改操作（Create/Update/Delete）成功后，必须调用 `queryClient.invalidateQueries` 刷新相关的查询缓存。

### 5. 加载状态
- 在 Page 层级处理整体的 `isLoading` 状态，配合 `src/components/ui/` 中的 `Loader` 或 `Skeleton` 组件。

## 注意事项
- 尽量通过 `Promise` 链式调用或 `async/await` 保持逻辑清晰。
- 对于不经常变动的数据（如文章类型列表），设置适当的 `staleTime: Infinity` 以减少冗余请求。
