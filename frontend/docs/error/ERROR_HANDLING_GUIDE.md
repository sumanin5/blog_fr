# 前端全局错误处理规范 (Error Handling Guide)

本项目的错误处理遵循 **“底层拦截翻译、高层简单调用”** 的原则。通过在 API 配置层统一拦截后端异常，将复杂的 JSON 结构转化为标准的 TypeScript `Error` 对象。

## 1. 后端异常结构 (The Contract)

后端（FastAPI）所有的业务异常都会遵循以下 JSON 结构：

```json
{
  "error": {
    "code": "BUSINESS_ERROR_CODE",
    "message": "人能读懂的错误提示",
    "details": {},
    "request_id": "req_...",
    "timestamp": "2024-..."
  }
}
```

## 2. 全局拦截器逻辑 (`config.ts`)

在 `src/shared/api/config.ts` 中，我们通过两大拦截器分工协作：

### A. 响应拦截器 (`client.interceptors.response`)
*   **职责**：处理状态码相关的**副作用**。
*   **典型场景**：监测到 `401` 时，自动清理本地 `Cookies` 和 `localStorage` 中的认证信息。
*   **原则**：不修改错误内容，只做“清理”动作。

### B. 错误拦截器 (`client.interceptors.error`)
*   **职责**：将“数据”转化为“对象”。
*   **功能**：
    1.  提取后端 `error.message` 作为标准的 `Error.message`。
    2.  特殊处理 `VALIDATION_ERROR` (422)，将字段校验数组拼成可读字符串。
    3.  将 `code`、`status` 等元数据挂载到 `Error` 对象上。
    4.  **抛出 (throw)** 这个转换后的对象，供 TanStack Query 捕获。

## 3. 在 Hooks 中使用

得益于全局拦截器，你在业务 Hooks 中处理错误变得极其简单。

### 推荐写法 (一致性模式)

```typescript
export function useCreatePost() {
  return useMutation({
    mutationFn: (data) => createPostByType({ body: data }),
    onSuccess: () => {
      toast.success("操作成功");
    },
    onError: (error) => {
      // 1. error 此时已经是一个标准的 Error 对象
      // 2. error.message 已经自动填充为了后端返回的“人话”
      toast.error(error.message);
    }
  });
}
```

### 特殊逻辑处理 (进阶模式)

如果你需要针对特定的错误代码执行不同的逻辑：

```typescript
onError: (error) => {
  // 利用拦截器挂载的元数据
  if ((error as any).code === 'INSUFFICIENT_CREDITS') {
    showUpgradeModal(); // 弹出充值/升级窗口
  } else {
    toast.error(error.message);
  }
}
```

## 4. 常见问题 (FAQ)

*   **所有的 any 怎么解决？**
    如果想彻底消除 `any`，可以在 `config.ts` 定义一个继承自 `Error` 的 `AppError` 类。
*   **校验错误显示太长怎么办？**
    拦截器目前通过 `; ` 拼接所有字段错误。如果需要逐个字段显示红字，应直接在组件内解析 `error.details.validation_errors`。
*   **网络断了会怎样？**
    拦截器有兜底逻辑。如果后端没响应或返回非 JSON 错误（如 Nginx 502），会显示“系统服务异常 (502)”。

---

**遵循此规范，可以让业务层代码量更少，且全站错误提示风格高度一致。**
