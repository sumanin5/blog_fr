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

### 3. API SDK 集成与命名转换 (CamelCase vs SnakeCase)

由于项目使用 `hey-api` 自动生成代码，而后端遵循 `snake_case` 规范，前端必须在 API 层实现彻底的隔离：

- **自动化全量转换 (Query, Body & Response)**:
  - 拦截器（`config.ts`）会自动将 **请求 Query**、**请求 Body**、**响应 Body** 全部进行 Case 转换。
  - **业务层 (Hooks/Components)**：100% 使用驼峰命名，禁止出现蛇形 Key。
- **避坑逻辑 (TS 静态契约与运行时转换的矛盾)**:
  - 虽然拦截器在运行时会转换，但 SDK 生成的 TS 定义依然期望蛇形 Key（如 `include_mdx`）。如果直接传 `{ includeMdx }`，TS 会报属性缺失。
  - **核心准则：零 any 策略**。
    - **严禁** 使用 `as any`。
    - **规范**：从 `@/shared/api/generated/types.gen` 导入接口对应的 `Data` 类型，使用 `as unknown as Data['query']` 或 `as unknown as Data['body']` 进行受控断言。
- **路径参数 (Path Parameters)**:
  - 处理时机较早，SDK 在进入拦截器前就会完成 URL 拼接。
  - **规则**：在 `path` 属性中显式书写蛇形 Key，但 Value 使用驼峰变量。通过 `as unknown as Data['path']` 闭合类型链。
- **Query 查询示例**:

  ```typescript
  import { getUserFiles } from "@/shared/api";
  import type { GetUserFilesData } from "@/shared/api/generated/types.gen";

  // ...
  const response = await getUserFiles({
    // ✅ 业务传入驼峰对象，拦截器自动转蛇形
    query: filters as unknown as GetUserFilesData["query"],
    throwOnError: true,
  });
  ```

- **Mutation 操作示例**:

  ```typescript
  import { createPostByType } from "@/shared/api";
  import type { CreatePostByTypeData } from "@/shared/api/generated/types.gen";
  import { PostCreate as DomainPostCreate } from "@/shared/api/types";

  // ...
  await createPostByType({
    path: { post_type: type } as unknown as CreatePostByTypeData["path"],
    // ✅ Data 模型是驼峰的，通过 unknown 断言骗过 SDK 的蛇形定义
    body: data as unknown as CreatePostByTypeData["body"],
    throwOnError: true,
  });
  ```

### 4. 交互与反馈标准

- **成功反馈**: 在 `Mutation` 的 `onSuccess` 回调中使用 `sonner` 库的 `toast.success()` 提供反馈。
- **错误处理**: 统一在 `onError` 中使用 `toast.error()` 展示后端返回的错误信息。
- **数据同步**: 在执行修改操作（Create/Update/Delete）成功后，必须调用 `queryClient.invalidateQueries` 刷新相关的查询缓存。

### 5. 类型管理规范 (Type Management Flow)

为了防止类型冲突和命名混乱，严禁在业务组件中直接从 `generated` 导入原始类型。

- **导入优先级**:
  1. 优先从 `@/shared/api/types.ts` 查找高保真驼峰类型。
  2. 如果缺失，去 `@/shared/api/generated/types.gen.ts` 查找原始类型。
  3. 将找到的原始类型导入到 `@/shared/api/types.ts` 中，使用 `ApiData<Raw.Type>` 包裹转换。
  4. 最后一步才是手动编写自定义 Interface。
- **命名准则**:
  - 始终使用 PascalCase 给类型命名。
  - 遵循 `[领域实体][属性/动作]` 模式（如 `MediaUpdatePayload`, `PostDetail`）。

### 6. 加载状态

- 在 Page 层级处理整体的 `isLoading` 状态，配合 `src/components/ui/` 中的 `Loader` 或 `Skeleton` 组件。

## 注意事项

- 尽量通过 `Promise` 链式调用或 `async/await` 保持逻辑清晰。
- 对于不经常变动的数据（如文章类型列表），设置适当的 `staleTime: Infinity` 以减少冗余请求。
- **DRY 原则**: 如果多个 Hook 使用相同的转换或 Key 逻辑，抽象为 constants 或 utils。
