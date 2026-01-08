# Zod 表单验证实现

## 概述

我们使用 Zod 库来替代手动验证，确保前端验证规则与后端 Pydantic 模型完全一致。

## 验证规则匹配

### 登录表单 (LoginSchema)

- **username**: 必填，自动去除空格
- **password**: 6-100位字符

### 注册表单 (RegisterSchema)

- **username**: 3-50位字符，自动去除空格
- **email**: 使用 `z.email()` 进行邮箱格式验证
- **password**: 6-100位字符
- **confirmPassword**: 必须与密码一致（使用 `refine` 验证）

## 实现特点

1. **类型安全**: 使用 `z.infer<typeof schema>` 自动生成 TypeScript 类型
2. **错误处理**: 将 Zod 错误格式转换为组件期望的格式
3. **后端一致性**: 验证规则完全匹配后端 Pydantic 模型

## 使用方式

```typescript
import { validateLogin, validateRegister } from "@/lib/validations/auth";

// 验证登录数据
const validation = validateLogin(formData);
if (!validation.success) {
  // 处理验证错误
  const errors = {};
  validation.error.issues.forEach((err) => {
    const field = err.path[0] as string;
    errors[field] = [err.message];
  });
}

// 获取验证通过的数据
const loginData = validation.data;
```

## 优势

- ✅ 统一的验证逻辑
- ✅ 类型安全
- ✅ 与后端规则一致
- ✅ 更好的错误消息
- ✅ 易于维护和扩展
