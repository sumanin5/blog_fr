# API 操作 ID 配置指南

> 🎯 本文档说明如何让自动生成的前端 API 函数名变得更简洁、可读。

---

## 问题：默认生成的函数名太长

默认情况下，FastAPI 自动生成的 `operationId` 会包含函数名、路径和 HTTP 方法，导致前端生成的函数名非常冗长：

| 后端函数名              | 默认生成的前端函数名              |
| ----------------------- | --------------------------------- |
| `register_user`         | `registerUserUsersRegisterPost`   |
| `login`                 | `loginUsersLoginPost`             |
| `get_current_user_info` | `getCurrentUserInfoUsersMeGet`    |
| `delete_user_by_id`     | `deleteUserByIdUsersUserIdDelete` |

这种命名方式虽然唯一且精确，但在前端使用时非常不友好。

---

## 解决方案：两种方法

### 方法 1：全局自动生成（推荐）⭐

在 `main.py` 中配置一个全局函数，自动为所有路由生成简洁的 `operation_id`：

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.routing import APIRoute

def custom_generate_unique_id(route: APIRoute) -> str:
    """
    自动将函数名从 snake_case 转换为 camelCase

    示例：
    - register_user -> registerUser
    - get_current_user_info -> getCurrentUserInfo
    """
    def to_camel_case(snake_str: str) -> str:
        components = snake_str.split('_')
        return components[0] + ''.join(x.title() for x in components[1:])

    return to_camel_case(route.name)

app = FastAPI(
    generate_unique_id_function=custom_generate_unique_id,
)
```

**优点**：

- ✅ 一次配置，全局生效
- ✅ 不会遗漏任何路由
- ✅ 命名规则统一

**缺点**：

- ❌ 不够灵活（所有路由都遵循同一规则）

---

### 方法 2：手动设置 `operation_id`

在每个路由装饰器上手动添加 `operation_id` 参数：

### 修改前

```python
@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="注册新用户",
    description="创建一个新用户账号",
)
async def register_user(...):
    pass
```

生成的前端函数名：`registerUserUsersRegisterPost` 😰

### 修改后

```python
@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="注册新用户",
    description="创建一个新用户账号",
    operation_id="register",  # 👈 添加这一行！
)
async def register_user(...):
    pass
```

生成的前端函数名：`register` 🎉

---

## 命名建议

### 1. 使用 camelCase（驼峰命名）

虽然 Python 习惯使用 `snake_case`，但 JavaScript/TypeScript 习惯使用 `camelCase`。
因此 `operation_id` 建议使用驼峰命名：

| 操作         | 推荐的 operation_id |
| ------------ | ------------------- |
| 注册         | `register`          |
| 登录         | `login`             |
| 获取当前用户 | `getMe`             |
| 更新当前用户 | `updateMe`          |
| 删除当前用户 | `deleteMe`          |
| 获取用户列表 | `getUsers`          |
| 获取指定用户 | `getUserById`       |
| 更新指定用户 | `updateUserById`    |
| 删除指定用户 | `deleteUserById`    |

### 2. 保持简洁但有意义

- ✅ `getMe` — 简洁，含义明确
- ✅ `getUserById` — 简洁，表明需要 ID
- ❌ `get` — 太模糊，不知道获取什么
- ❌ `getCurrentlyLoggedInUserInfo` — 太长了

### 3. 避免与保留字冲突

不要使用 JavaScript 的保留字作为函数名：

- ❌ `delete` — JS 保留字
- ✅ `deleteMe` 或 `removeUser`
- ❌ `new` — JS 保留字
- ✅ `create` 或 `add`

---

## 完整示例

### 后端代码 (`backend/app/users/router.py`)

```python
from fastapi import APIRouter, status

router = APIRouter()

# ========================================
# 公开接口
# ========================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="注册新用户",
    description="创建一个新用户账号",
    operation_id="register",  # 👈 前端函数名: register()
)
async def register_user(...):
    pass


@router.post(
    "/login",
    summary="用户登录",
    description="使用用户名/邮箱和密码登录",
    operation_id="login",  # 👈 前端函数名: login()
)
async def login(...):
    pass


# ========================================
# 需要登录的接口
# ========================================

@router.get(
    "/me",
    response_model=UserResponse,
    summary="获取当前用户信息",
    operation_id="getMe",  # 👈 前端函数名: getMe()
)
async def get_current_user_info(...):
    pass


@router.put(
    "/me",
    response_model=UserResponse,
    summary="更新当前用户信息",
    operation_id="updateMe",  # 👈 前端函数名: updateMe()
)
async def update_current_user_info(...):
    pass


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除当前用户",
    operation_id="deleteMe",  # 👈 前端函数名: deleteMe()
)
async def delete_current_user_account(...):
    pass


# ========================================
# 管理员接口
# ========================================

@router.get(
    "/",
    response_model=UserListResponse,
    summary="获取用户列表",
    operation_id="getUsers",  # 👈 前端函数名: getUsers()
)
async def get_users_list(...):
    pass


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="获取指定用户信息",
    operation_id="getUserById",  # 👈 前端函数名: getUserById()
)
async def get_user_by_id(...):
    pass


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="更新指定用户信息",
    operation_id="updateUserById",  # 👈 前端函数名: updateUserById()
)
async def update_user_by_id(...):
    pass


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除指定用户",
    operation_id="deleteUserById",  # 👈 前端函数名: deleteUserById()
)
async def delete_user_by_id(...):
    pass
```

### 生成结果对比

| 之前（默认）                            | 之后（自定义 operation_id） |
| --------------------------------------- | --------------------------- |
| `registerUserUsersRegisterPost`         | `register`                  |
| `loginUsersLoginPost`                   | `login`                     |
| `getCurrentUserInfoUsersMeGet`          | `getMe`                     |
| `updateCurrentUserInfoUsersMePut`       | `updateMe`                  |
| `deleteCurrentUserAccountUsersMeDelete` | `deleteMe`                  |
| `getUsersListUsersGet`                  | `getUsers`                  |
| `getUserByIdUsersUserIdGet`             | `getUserById`               |
| `updateUserByIdUsersUserIdPut`          | `updateUserById`            |
| `deleteUserByIdUsersUserIdDelete`       | `deleteUserById`            |

---

## 更新流程

当你修改了后端的 `operation_id` 后，需要重新生成前端代码：

```bash
# 1. 导出 OpenAPI 规范
cd backend
uv run python scripts/export_openapi.py

# 2. 生成前端代码
cd ../frontend
npm run api:generate
```

---

## 注意事项

1.  **operation_id 必须全局唯一**：整个 API 中不能有两个路由使用相同的 `operation_id`。
2.  **修改后需要重新生成**：`operation_id` 是 OpenAPI 规范的一部分，修改后需要重新导出并生成前端代码。
3.  **类型名也会变短**：相关的类型名（如 `RegisterData`, `LoginResponses`）也会随之变短。

---

## 前端使用示例

修改后，前端代码变得非常优雅：

```typescript
// 之前（冗长版）
import { registerUserUsersRegisterPost } from '@/api';
await registerUserUsersRegisterPost({ body: { username: 'alice', ... } });

// 之后（简洁版）
import { register, login, getMe } from '@/api';

// 注册
await register({ body: { username: 'alice', email: 'a@b.com', password: '123' } });

// 登录
await login({ body: { username: 'alice', password: '123' } });

// 获取当前用户
const { data: user } = await getMe();
```

---

## 最佳实践：结合两种方法 🌟

**推荐做法**：使用全局函数作为默认规则，在特殊情况下手动覆盖。

```python
# main.py - 设置全局规则
app = FastAPI(
    generate_unique_id_function=custom_generate_unique_id,
)

# router.py - 大部分路由依赖全局规则
@router.post("/register")
async def register_user(...):  # 自动生成: registerUser
    pass

# 特殊情况手动覆盖
@router.post("/special", operation_id="myCustomName")
async def some_very_long_function_name(...):  # 使用: myCustomName
    pass
```

**手动设置的 `operation_id` 优先级更高**，会覆盖全局函数生成的结果。

### 何时使用手动设置？

- 函数名太长或不符合前端习惯
- 需要更简洁的名称（如 `login` 而不是 `loginUser`）
- 需要与现有前端代码保持兼容

---

_文档创建时间: 2025-12-05_
