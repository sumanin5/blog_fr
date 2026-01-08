# 前端开发待办清单

> 🎯 本文档列出了使用自动生成 API 后，你还需要手动编写的所有文件。
>
> 按照这个清单自上而下完成，就能构建出一个完整的前端应用。

---

## 📁 项目结构预览

```
frontend/src/
├── api/                    🤖 已自动生成
│   ├── sdk.gen.ts
│   ├── types.gen.ts
│   └── config.ts           ✅ 已完成
│
├── contexts/               ✏️ 需要手写
│   └── AuthContext.tsx
│
├── hooks/                  ✏️ 需要手写
│   └── useAuth.ts          （可选，已集成在 AuthContext 中）
│
├── components/             ✏️ 需要手写
│   ├── ui/                 （UI 组件库，可用 shadcn）
│   ├── ProtectedRoute.tsx
│   └── LoadingSpinner.tsx
│
├── pages/                  ✏️ 需要手写
│   ├── Home.tsx
│   ├── auth/
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   └── users/
│       └── Profile.tsx
│
├── App.tsx                 ✏️ 需要修改（添加路由和 Provider）
└── main.tsx                ✅ 已完成（导入 config.ts）
```

---

## 1️⃣ AuthContext.tsx - 认证状态管理

**路径**: `src/contexts/AuthContext.tsx`

**作用**: 全局管理用户登录状态，让任何组件都能获取当前用户信息。

### 需要包含的内容

```typescript
// 1. 导入生成的 API 函数
import { login as apiLogin, registerUser, getCurrentUserInfo } from "@/api";
import type { UserResponse } from "@/api";

// 2. 定义 Context 的类型
interface AuthContextType {
  user: UserResponse | null; // 当前用户
  isLoading: boolean; // 是否正在加载
  isAuthenticated: boolean; // 是否已登录
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// 3. 创建 Context
// 4. 创建 Provider 组件
// 5. 导出 useAuth Hook
```

### 编写要点

1. **初始化时检查 Token**：

   - `useEffect` 中检查 `localStorage` 是否有 `access_token`
   - 有则调用 `getCurrentUserInfo()` 获取用户信息
   - 无论成功失败，都要设置 `isLoading = false`

2. **login 函数**：

   - 调用 `apiLogin({ body: { username, password } })`
   - 成功后将 Token 存入 `localStorage`
   - 调用 `refreshUser()` 更新用户状态

3. **logout 函数**：

   - 清除 `localStorage` 中的 Token
   - 将 `user` 设为 `null`

4. **useAuth Hook**：
   - 使用 `useContext` 获取 Context
   - 如果在 Provider 外使用则抛出错误

---

## 2️⃣ ProtectedRoute.tsx - 路由守卫

**路径**: `src/components/ProtectedRoute.tsx`

**作用**: 保护需要登录才能访问的页面。

### 需要包含的内容

```typescript
// 1. 导入 useAuth 和路由工具
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

// 2. 组件接收 children 作为参数
interface Props {
  children: React.ReactNode;
}

// 3. 根据认证状态决定渲染什么
// - isLoading: 显示加载动画
// - !isAuthenticated: 跳转到登录页
// - isAuthenticated: 渲染 children
```

### 编写要点

1. **处理加载状态**：用户刷新页面时，需要先检查 Token，这期间显示 Loading
2. **使用 Navigate 组件**：`<Navigate to="/login" replace />`
3. **replace 属性**：防止用户点击返回按钮回到被保护的页面

---

## 3️⃣ Login.tsx - 登录页面

**路径**: `src/pages/auth/Login.tsx`

**作用**: 用户登录界面。

### 需要包含的内容

```typescript
// 1. 使用 useState 管理表单状态
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);

// 2. 使用 useAuth 获取 login 函数
const { login } = useAuth();
const navigate = useNavigate();

// 3. 处理表单提交
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  try {
    await login(username, password);
    navigate("/dashboard");
  } catch (err) {
    setError("用户名或密码错误");
  } finally {
    setIsSubmitting(false);
  }
};

// 4. 渲染表单 UI
```

### 编写要点

1. **表单验证**：提交前检查用户名和密码是否为空
2. **错误处理**：捕获登录失败，显示友好的错误信息
3. **加载状态**：提交时禁用按钮，显示"登录中..."
4. **成功跳转**：登录成功后使用 `navigate()` 跳转

---

## 4️⃣ Register.tsx - 注册页面

**路径**: `src/pages/auth/Register.tsx`

**作用**: 新用户注册界面。

### 需要包含的内容

```typescript
// 1. 表单字段
const [formData, setFormData] = useState({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  full_name: "",
});

// 2. 使用 useAuth 获取 register 函数
const { register } = useAuth();

// 3. 处理表单提交
// - 验证密码一致性
// - 调用 register
// - 成功后跳转到登录页
```

### 编写要点

1. **密码确认**：检查两次输入的密码是否一致
2. **邮箱格式验证**：可使用正则或 HTML5 的 `type="email"`
3. **成功处理**：可以选择自动登录或跳转到登录页

---

## 5️⃣ Profile.tsx - 个人资料页

**路径**: `src/pages/users/Profile.tsx`

**作用**: 展示和编辑当前用户信息。

### 需要包含的内容

```typescript
// 1. 获取当前用户
const { user, refreshUser } = useAuth();

// 2. 编辑模式状态
const [isEditing, setIsEditing] = useState(false);
const [formData, setFormData] = useState({
  full_name: user?.full_name || "",
  bio: user?.bio || "",
});

// 3. 保存更改
import { updateCurrentUserInfo } from "@/api";

const handleSave = async () => {
  await updateCurrentUserInfo({ body: formData });
  await refreshUser(); // 刷新用户数据
  setIsEditing(false);
};

// 4. 渲染用户信息卡片
```

### 编写要点

1. **展示模式 vs 编辑模式**：切换时显示不同的 UI
2. **表单预填充**：编辑时表单应该显示当前值
3. **保存后刷新**：调用 `refreshUser()` 更新全局状态

---

## 6️⃣ App.tsx - 根组件和路由

**路径**: `src/App.tsx`

**作用**: 配置应用的路由和全局 Provider。

### 需要修改的内容

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// 页面组件
import Home from "@/pages/Home";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Profile from "@/pages/users/Profile";
import Dashboard from "@/pages/Dashboard";

function App() {
  return (
    // 1. 用 AuthProvider 包裹整个应用
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 2. 公开路由 */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 3. 受保护路由 */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* 4. 404 页面 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

### 编写要点

1. **Provider 层级**：`AuthProvider` 要在 `BrowserRouter` 外层或内层都可以
2. **嵌套布局**：可以使用 `<Outlet>` 实现共享布局
3. **路由组织**：可以按模块拆分路由配置

---

## 7️⃣ LoadingSpinner.tsx - 加载动画（可选）

**路径**: `src/components/LoadingSpinner.tsx`

**作用**: 复用的加载动画组件。

### 编写要点

1. 使用 CSS 动画或 SVG
2. 可以接受 `size` 参数控制大小
3. 配合 Tailwind 的 `animate-spin` 很方便

---

## 📋 开发顺序建议

按以下顺序开发，避免依赖问题：

```
1. AuthContext.tsx          ← 基础设施，最先完成
   ↓
2. ProtectedRoute.tsx       ← 依赖 AuthContext
   ↓
3. Login.tsx                ← 依赖 AuthContext
   ↓
4. Register.tsx             ← 依赖 AuthContext
   ↓
5. App.tsx（更新路由）       ← 集成所有组件
   ↓
6. Profile.tsx              ← 可以最后完成
   ↓
7. 其他业务页面...
```

---

## 🔧 调试技巧

1. **检查 Token**：

   ```javascript
   // 浏览器控制台
   localStorage.getItem("access_token");
   ```

2. **检查 API 请求**：

   - 打开浏览器开发者工具 → Network 标签
   - 查看请求的 Headers 是否包含 `Authorization`

3. **检查用户状态**：
   ```typescript
   // 在任何组件中
   const { user, isAuthenticated } = useAuth();
   console.log("User:", user, "Authenticated:", isAuthenticated);
   ```

---

## 📚 相关文档

- [API 客户端配置指南](../../../docs/api/API_CONFIG_GUIDE.md)
- [OpenAPI 代码生成指南](../../../docs/api/OPENAPI_CODEGEN_GUIDE.md)
- [生成代码解释](../../../docs/api/GENERATED_CODE_EXPLAINED.md)

---

_祝你编码愉快！有问题随时问我。_ 🚀
