# 故障排查指南

## 常见问题

### 1. 测试服务器无法启动

#### 问题：端口 8001 已被占用

```bash
Error: [Errno 48] Address already in use
```

**解决方案**：

```bash
# 查找占用端口的进程
lsof -i :8001

# 或者
netstat -an | grep 8001

# 杀死进程
kill -9 <PID>

# 或者修改测试服务器端口
# backend/scripts/run_test_server.py
uvicorn.run(app, port=8002)  # 使用其他端口
```

#### 问题：数据库文件被锁定

```bash
sqlite3.OperationalError: database is locked
```

**解决方案**：

```bash
# 删除测试数据库文件
rm backend/test_server.db

# 重新启动测试服务器
python backend/scripts/run_test_server.py
```

### 2. 前端测试失败

#### 问题：无法连接到测试服务器

```
Error: connect ECONNREFUSED 127.0.0.1:8001
```

**检查清单**：

1. 测试服务器是否正在运行？

```bash
curl http://localhost:8001/api/test/status
```

2. 环境变量是否正确？

```typescript
// vitest.config.ts
env: {
  VITE_API_BASE_URL: "http://localhost:8001";
}
```

3. 防火墙是否阻止了连接？

#### 问题：测试超时

```
Error: Timeout - Async callback was not invoked within the 5000 ms timeout
```

**解决方案**：

```typescript
// 增加超时时间
it("should load data", async () => {
  // ...
}, 10000); // 10 秒超时

// 或者在配置中全局设置
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 10000,
  },
});
```

### 3. 数据库状态问题

#### 问题：测试间数据泄露

```typescript
// 测试 A 创建了数据
it("test A", async () => {
  await createPost({ title: "Test" });
});

// 测试 B 看到了测试 A 的数据
it("test B", async () => {
  const posts = await getPosts();
  expect(posts.length).toBe(0); // 失败：length = 1
});
```

**解决方案**：

```typescript
// 确保每个测试前重置数据库
beforeEach(async () => {
  await resetTestDB();
});

// 或者在每个测试中显式重置
it("test B", async () => {
  await resetTestDB();
  const posts = await getPosts();
  expect(posts.length).toBe(0);
});
```

#### 问题：外键约束错误

```
IntegrityError: FOREIGN KEY constraint failed
```

**解决方案**：

```python
# backend/app/api/test_router.py
@router.post("/db/reset")
async def reset_database():
    # 按正确的顺序删除表（先删除依赖表）
    from app.posts.model import Post
    from app.users.model import User

    # 先删除 Post（依赖 User）
    db.query(Post).delete()
    # 再删除 User
    db.query(User).delete()

    db.commit()
```

### 4. 认证问题

#### 问题：Token 未传递

```
Error: 401 Unauthorized
```

**检查清单**：

1. Token 是否存储在 localStorage？

```typescript
const token = localStorage.getItem("auth_token");
console.log("Token:", token);
```

2. API 客户端是否配置了认证拦截器？

```typescript
// frontend/src/shared/api/client.ts
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

3. 测试中是否正确登录？

```typescript
beforeEach(async () => {
  await resetTestDB();
  await testAuth.login(); // 确保登录
});
```

### 5. React Query 问题

#### 问题：缓存导致测试失败

```typescript
it("test A", async () => {
  const { result } = renderHook(() => useGetPosts());
  // 返回缓存的数据，而不是最新数据
});
```

**解决方案**：

```typescript
describe("Posts", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          cacheTime: 0, // 不缓存
          staleTime: 0, // 立即过期
          retry: false, // 不重试
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear(); // 清理缓存
  });
});
```

#### 问题：Hook 未正确更新

```typescript
it("should update data", async () => {
  const { result } = renderHook(() => useGetPosts());

  // 修改数据
  await createPost({ title: "New" });

  // 期望 Hook 自动更新，但没有
  expect(result.current.data?.items).toContainEqual(
    expect.objectContaining({ title: "New" })
  ); // 失败
});
```

**解决方案**：

```typescript
it("should update data", async () => {
  const { result, rerender } = renderHook(() => useGetPosts());

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  // 修改数据
  await createPost({ title: "New" });

  // 手动触发重新获取
  await act(async () => {
    await result.current.refetch();
  });

  // 或者使用 invalidateQueries
  queryClient.invalidateQueries(["posts"]);

  await waitFor(() => {
    expect(result.current.data?.items).toContainEqual(
      expect.objectContaining({ title: "New" })
    );
  });
});
```

## 调试技巧

### 1. 查看测试服务器日志

```python
# backend/scripts/run_test_server.py
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# 查看 SQL 查询
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

### 2. 在测试中打印状态

```typescript
it("debug test", async () => {
  const { result } = renderHook(() => useGetPosts());

  console.log("Initial state:", result.current);

  await waitFor(() => {
    console.log("Current state:", {
      isLoading: result.current.isLoading,
      isError: result.current.isError,
      isSuccess: result.current.isSuccess,
      data: result.current.data,
      error: result.current.error,
    });

    expect(result.current.isSuccess).toBe(true);
  });
});
```

### 3. 使用 Vitest UI

```bash
pnpm test --ui
```

打开浏览器查看：

- 测试执行时间
- 测试失败详情
- 控制台输出
- 代码覆盖率

### 4. 检查网络请求

```typescript
// 使用 MSW 拦截器查看请求
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
  http.all("*", ({ request }) => {
    console.log("Request:", {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers),
    });

    // 继续请求
    return passthrough();
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());
```

## 性能问题

### 测试运行太慢

**原因分析**：

1. 每个测试都重置数据库（慢）
2. 真实 HTTP 请求（比 Mock 慢）
3. 数据库查询（慢）

**优化方案**：

```typescript
// 1. 使用内存数据库
// backend/scripts/run_test_server.py
TEST_DATABASE_URL = "sqlite:///:memory:"

// 2. 并发运行测试（小心数据隔离）
// vitest.config.ts
export default defineConfig({
  test: {
    threads: true,
    maxConcurrency: 5
  }
})

// 3. 只在必要时重置数据库
describe('Posts', () => {
  // 整个套件只重置一次
  beforeAll(async () => {
    await resetTestDB()
  })

  // 每个测试后清理特定数据
  afterEach(async () => {
    await db.query(Post).delete()
  })
})

// 4. 使用快速重置
@router.post("/db/reset-fast")
async def reset_fast():
    # 只删除数据，不重建表结构
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()
```

## 持续集成问题

### GitHub Actions 失败

```yaml
# .github/workflows/test.yml
- name: Start Test Server
  run: |
    cd backend
    python scripts/run_test_server.py &

    # 等待服务器启动
    timeout 30 bash -c 'until curl -f http://localhost:8001/api/test/status; do sleep 1; done'

- name: Run Tests
  run: |
    cd frontend
    pnpm test
```

## 获取帮助

如果以上方法都无法解决问题：

1. 查看完整的错误堆栈
2. 检查测试服务器日志
3. 使用 `--reporter=verbose` 运行测试
4. 在 GitHub Issues 中搜索类似问题
5. 提交新的 Issue，包含：
   - 错误信息
   - 测试代码
   - 环境信息（Node 版本、Python 版本等）

## 下一步

- 返回 [README.md](./README.md)
- 查看 [05-best-practices.md](./05-best-practices.md)
