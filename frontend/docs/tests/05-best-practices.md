# 集成测试最佳实践

## 测试隔离原则

### 每个测试都是独立的

```typescript
// ✅ 好的做法
describe("Posts API", () => {
  beforeEach(async () => {
    await resetTestDB(); // 每个测试前重置
  });

  it("should create post", async () => {
    // 测试 A：从干净状态开始
  });

  it("should update post", async () => {
    // 测试 B：也从干净状态开始，不依赖测试 A
  });
});

// ❌ 坏的做法
describe("Posts API", () => {
  let postId: string;

  it("should create post", async () => {
    const post = await createPost();
    postId = post.id; // 测试 B 依赖这个 ID
  });

  it("should update post", async () => {
    await updatePost(postId); // 如果测试 A 失败，这里会出错
  });
});
```

## 数据准备策略

### 使用 Seed 函数

```typescript
// frontend/src/lib/test-seeds.ts

/**
 * 创建基础测试数据
 */
export async function seedBasicData() {
  await resetTestDB();

  // 创建用户
  const user = await createTestUser();

  // 创建分类
  const categories = await Promise.all([
    createCategory({ name: "Tech", slug: "tech" }),
    createCategory({ name: "Life", slug: "life" }),
  ]);

  return { user, categories };
}

/**
 * 创建大量文章（用于分页测试）
 */
export async function seedManyPosts(count: number = 50) {
  const { user } = await seedBasicData();

  const posts = [];
  for (let i = 0; i < count; i++) {
    posts.push(
      createPost({
        title: `Post ${i}`,
        content: `Content ${i}`,
        author_id: user.id,
      })
    );
  }

  await Promise.all(posts);
}

// 使用
it("should paginate posts", async () => {
  await seedManyPosts(50);

  const { result } = renderHook(() => useGetPosts({ page: 1, page_size: 10 }));

  await waitFor(() => {
    expect(result.current.data?.items.length).toBe(10);
    expect(result.current.data?.total).toBe(50);
  });
});
```

## 异步测试技巧

### 正确使用 waitFor

```typescript
// ✅ 好的做法
it("should load data", async () => {
  const { result } = renderHook(() => useGetPosts());

  // 等待特定条件
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  // 现在可以安全地访问数据
  expect(result.current.data).toBeDefined();
});

// ❌ 坏的做法
it("should load data", async () => {
  const { result } = renderHook(() => useGetPosts());

  // 固定延迟：不可靠
  await new Promise((resolve) => setTimeout(resolve, 1000));

  expect(result.current.data).toBeDefined(); // 可能还没加载完
});
```

### 处理 React Query 缓存

```typescript
describe("Posts with cache", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0, // 不缓存
          staleTime: 0, // 立即过期
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear(); // 清理缓存
  });
});
```

## 错误处理测试

```typescript
describe("Error Handling", () => {
  it("should handle 404 errors", async () => {
    const { result } = renderHook(() => useGetPost({ id: "nonexistent" }));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toMatchObject({
      status: 404,
      message: expect.stringContaining("not found"),
    });
  });

  it("should handle network errors", async () => {
    // 停止测试服务器或使用错误的 URL
    const { result } = renderHook(() => useGetPosts(), {
      wrapper: ({ children }) => (
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: {
                queries: {
                  retry: false,
                  // 使用错误的 URL
                  queryFn: () => fetch("http://localhost:9999/api/posts"),
                },
              },
            })
          }
        >
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

## 性能优化

### 并发测试

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // 串行执行（更安全，但慢）
    threads: false,

    // 或者并发执行（更快，但需要注意数据隔离）
    // threads: true,
    // maxConcurrency: 5
  },
});
```

### 使用内存数据库

```python
# backend/scripts/run_test_server.py

# 更快的测试执行
TEST_DATABASE_URL = "sqlite:///:memory:"

# 或者使用临时文件
import tempfile
TEST_DATABASE_URL = f"sqlite:///{tempfile.mktemp()}.db"
```

### 选择性运行测试

```bash
# 只运行集成测试
pnpm test:integration

# 只运行特定文件
pnpm test useAuth.integration.test.ts

# 使用 watch 模式
pnpm test --watch
```

## 调试技巧

### 查看测试服务器日志

```python
# backend/scripts/run_test_server.py
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# 现在可以看到所有 SQL 查询和 API 请求
```

### 在测试中打印状态

```typescript
it("should debug data", async () => {
  const { result } = renderHook(() => useGetPosts());

  await waitFor(() => {
    console.log("Current state:", {
      isLoading: result.current.isLoading,
      isError: result.current.isError,
      data: result.current.data,
    });

    expect(result.current.isSuccess).toBe(true);
  });
});
```

### 使用 Vitest UI

```bash
pnpm test --ui
```

打开浏览器查看测试执行情况，可以看到每个测试的详细信息。

## 常见陷阱

### 1. 忘记等待异步操作

```typescript
// ❌ 错误
it("should create post", async () => {
  const { result } = renderHook(() => useCreatePost());

  result.current.mutate({ title: "Test" });

  expect(result.current.isSuccess).toBe(true); // 还没完成！
});

// ✅ 正确
it("should create post", async () => {
  const { result } = renderHook(() => useCreatePost());

  await act(async () => {
    await result.current.mutateAsync({ title: "Test" });
  });

  expect(result.current.isSuccess).toBe(true);
});
```

### 2. 测试间状态泄露

```typescript
// ❌ 错误：全局变量在测试间共享
let globalUser: User;

it("test A", async () => {
  globalUser = await createTestUser();
});

it("test B", async () => {
  // globalUser 可能是 undefined（如果测试 A 没运行）
  expect(globalUser.id).toBeDefined();
});

// ✅ 正确：每个测试独立创建
it("test A", async () => {
  const user = await createTestUser();
  // 使用 user
});

it("test B", async () => {
  const user = await createTestUser();
  // 使用 user
});
```

### 3. 过度依赖测试顺序

```typescript
// ❌ 错误：测试顺序依赖
describe("Posts", () => {
  it("1. should create", async () => {
    /* ... */
  });
  it("2. should update", async () => {
    /* 依赖测试 1 */
  });
  it("3. should delete", async () => {
    /* 依赖测试 2 */
  });
});

// ✅ 正确：每个测试独立
describe("Posts", () => {
  it("should create", async () => {
    await resetTestDB();
    // 完整的创建测试
  });

  it("should update", async () => {
    await resetTestDB();
    const post = await createTestPost(); // 自己创建依赖
    // 更新测试
  });
});
```

## 测试覆盖率

### 关注关键路径

不要追求 100% 覆盖率，而是关注：

1. **认证流程**：登录、注册、Token 刷新
2. **核心业务逻辑**：创建、更新、删除
3. **复杂查询**：分页、筛选、排序
4. **错误处理**：404、401、500 等

### 覆盖率报告

```bash
# 生成覆盖率报告
pnpm test --coverage

# 查看报告
open coverage/index.html
```

## 持续集成

### GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install Backend Dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Start Test Server
        run: |
          cd backend
          python scripts/run_test_server.py &
          sleep 5  # 等待服务器启动

      - name: Install Frontend Dependencies
        run: |
          cd frontend
          pnpm install

      - name: Run Integration Tests
        run: |
          cd frontend
          pnpm test:integration
```

## 下一步

- [06-troubleshooting.md](./06-troubleshooting.md) - 故障排查指南
- 返回 [01-integration-testing-overview.md](./01-integration-testing-overview.md)
