# React 19 Server Actions 重构指南

## 概述

本文档记录了将登录和注册组件从传统的 React Hook Form 模式重构为 React 19 Server Actions 模式的过程和最佳实践。

## 重构对比

### 旧模式：React Hook Form + useState

```typescript
// ❌ 旧的实现方式
export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login({ username, password });
      navigate("/");
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      {/* 更多状态管理... */}
    </form>
  );
}
```

### 新模式：React 19 Server Actions

```typescript
// ✅ 新的实现方式
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  async function loginAction(
    _prevState: LoginState | null,
    formData: FormData
  ): Promise<LoginState> {
    // 从 FormData 提取数据
    const loginData = {
      username: (formData.get("username") as string)?.trim() || "",
      password: (formData.get("password") as string) || ""
    };

    // 验证和处理逻辑...
    try {
      await login(loginData);
      return { success: true, redirectTo: "/" };
    } catch (err) {
      return { success: false, errors: { general: [err.message] } };
    }
  }

  const [state, action, isPending] = useActionState(loginAction, null);

  return (
    <form action={action}>
      <input name="username" required />
      {/* 无需状态管理 */}
    </form>
  );
}
```

## 主要改进

### 1. 状态管理简化

**之前**：

- 需要管理多个 `useState`
- 手动处理表单状态
- 复杂的错误状态管理

**现在**：

- 单一的 `useActionState`
- 自动的表单状态管理
- 统一的状态结构

### 2. 类型安全

**FormData 处理模式**：

```typescript
// 必须使用 FormData 类型
async function registerAction(
  _prevState: RegisterState | null,
  formData: FormData, // 这是固定的
): Promise<RegisterState> {
  // 在函数内部转换为类型安全的对象
  const registerData: RegisterFormData = {
    username: (formData.get("username") as string)?.trim() || "",
    email: (formData.get("email") as string)?.trim() || "",
    password: (formData.get("password") as string) || "",
    confirmPassword: (formData.get("confirmPassword") as string) || "",
  };

  // 使用类型安全的对象进行后续处理
}
```

### 3. 错误处理统一

**统一的错误状态结构**：

```typescript
interface LoginState {
  success?: boolean;
  message?: string;
  errors?: {
    username?: string[];
    password?: string[];
    general?: string[];
  } | null;
  redirectTo?: string;
}
```

### 4. 渐进增强支持

**HTML 原生表单**：

- 即使 JavaScript 被禁用，表单仍然可以工作
- 更好的 SEO 和可访问性
- 符合 Web 标准

## 实现细节

### 表单验证

```typescript
// 客户端验证
const errors: { [key: string]: string[] } = {};

if (!registerData.username) {
  errors.username = ["请输入用户名"];
} else if (registerData.username.length < 3) {
  errors.username = ["用户名至少3位"];
}

// 如果有验证错误，直接返回
if (Object.keys(errors).length > 0) {
  return {
    success: false,
    message: "请检查输入内容",
    errors,
  };
}
```

### 成功处理和跳转

```typescript
// 在 action 中标记跳转
return {
  success: true,
  message: "登录成功！正在跳转...",
  redirectTo: "/",
};

// 在组件中监听并处理跳转
useEffect(() => {
  if (state?.success && state?.redirectTo) {
    const timer = setTimeout(() => {
      navigate(state.redirectTo!);
    }, 1000);
    return () => clearTimeout(timer);
  }
}, [state?.success, state?.redirectTo, navigate]);
```

### UI 状态绑定

```typescript
// 自动的 pending 状态
const [state, action, isPending] = useActionState(loginAction, null);

// 在 UI 中使用
<Button disabled={isPending}>
  {isPending ? "登录中..." : "立即登录"}
</Button>

// 错误显示
{state?.errors?.username && (
  <p className="text-destructive">
    {state.errors.username[0]}
  </p>
)}
```

## 最佳实践

### 1. FormData 提取

```typescript
// 创建辅助函数
function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// 使用辅助函数
const loginData = {
  username: getFormString(formData, "username"),
  password: getFormString(formData, "password"),
};
```

### 2. 错误处理

```typescript
// 统一的错误处理模式
try {
  await apiCall(data);
  return { success: true, message: "操作成功" };
} catch (err) {
  const errorMessage =
    err instanceof Error ? err.message : "操作失败，请稍后重试";

  return {
    success: false,
    message: errorMessage,
    errors: { general: [errorMessage] },
  };
}
```

### 3. 表单字段

```typescript
// 使用语义化的 HTML 属性
<Input
  name="username"        // FormData 键名
  type="text"           // 输入类型
  required              // HTML5 验证
  minLength={3}         // 最小长度
  aria-invalid={!!state?.errors?.username}  // 可访问性
/>
```

## 性能优势

1. **减少重渲染**：不需要频繁的状态更新
2. **更小的包体积**：减少了状态管理代码
3. **更好的用户体验**：原生表单行为 + React 增强
4. **服务器端友好**：支持 SSR 和 SSG

## 迁移检查清单

- [ ] 移除 `useState` 状态管理
- [ ] 移除 `useForm` 或类似的表单库
- [ ] 创建 Server Action 函数
- [ ] 使用 `useActionState` 替代状态管理
- [ ] 更新表单 JSX 使用 `action` 属性
- [ ] 添加 `name` 属性到所有输入字段
- [ ] 实现 FormData 提取逻辑
- [ ] 更新错误显示逻辑
- [ ] 测试表单提交和验证

## 相关文件

- `frontend/src/pages/auth/Login.tsx` - 登录组件
- `frontend/src/pages/auth/Register.tsx` - 注册组件
- `frontend/src/lib/form-utils.ts` - 表单工具函数
- `frontend/docs/testing/integration-vs-e2e.md` - 测试配置
