"""
用户管理相关 API 文档（管理员功能）

包含管理员查看、管理所有用户的接口文档。
"""

LIST_USERS_DOC = """
获取用户列表（管理员）

## 权限
- 需要管理员权限（`is_admin=true` 或 `is_superadmin=true`）

## 查询参数
- `page`: 页码（默认 1）
- `size`: 每页数量（默认 20，最大 100）
- `is_active`: 过滤激活状态（可选，true/false）
- `is_admin`: 过滤管理员（可选，true/false）
- `search`: 搜索关键词（可选，搜索用户名、邮箱、全名）

## 返回值
```json
{
    "items": [
        {
            "id": "uuid",
            "username": "johndoe",
            "email": "john@example.com",
            "full_name": "John Doe",
            "is_active": true,
            "is_admin": false,
            "is_superadmin": false,
            "created_at": "2026-01-23T10:00:00Z"
        }
    ],
    "total": 100,
    "page": 1,
    "size": 20,
    "pages": 5
}
```

## 示例
```bash
# 获取所有用户
GET /users?page=1&size=20

# 搜索用户
GET /users?search=john

# 过滤激活用户
GET /users?is_active=true

# 过滤管理员
GET /users?is_admin=true
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无管理员权限

## 注意事项
- 不返回密码字段
- 支持分页和搜索
- 适用于管理后台的用户管理界面
"""

GET_USER_DOC = """
获取指定用户信息（管理员）

## 权限
- 需要管理员权限

## 路径参数
- `user_id`: 用户 UUID

## 返回值
```json
{
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "is_active": true,
    "is_admin": false,
    "is_superadmin": false,
    "created_at": "2026-01-23T10:00:00Z",
    "updated_at": "2026-01-23T10:00:00Z"
}
```

## 示例
```bash
# 获取指定用户信息
GET /users/123e4567-e89b-12d3-a456-426614174000
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无管理员权限
- `404 NOT_FOUND`: 用户不存在

## 注意事项
- 不返回密码字段
- 管理员可以查看任何用户的信息
"""

UPDATE_USER_DOC = """
更新指定用户信息（管理员）

## 权限
- 需要管理员权限
- 普通管理员不能修改超级管理员
- 超级管理员可以修改任何用户

## 路径参数
- `user_id`: 用户 UUID

## 请求体
```json
{
    "email": "newemail@example.com",
    "full_name": "New Name",
    "is_active": true,
    "is_admin": false,
    "password": "newpassword123"
}
```

**所有字段都是可选的**，只更新提供的字段。

## 字段说明
- `email`: 新邮箱地址（可选）
- `full_name`: 新全名（可选）
- `is_active`: 激活状态（可选）
- `is_admin`: 管理员权限（可选，仅超级管理员可修改）
- `password`: 新密码（可选）

## 返回值
返回更新后的用户对象。

## 示例
```bash
# 禁用用户
PATCH /users/{user_id}
{
    "is_active": false
}

# 提升为管理员（仅超级管理员）
PATCH /users/{user_id}
{
    "is_admin": true
}

# 重置密码
PATCH /users/{user_id}
{
    "password": "newpassword123"
}
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无权限（普通管理员尝试修改超级管理员）
- `404 NOT_FOUND`: 用户不存在
- `400 BAD_REQUEST`: 邮箱已被使用

## 注意事项
- 不能修改用户名
- 普通管理员不能修改权限字段
- 修改密码后，用户的所有 token 仍然有效
- 禁用用户后，该用户无法登录（但 token 仍有效直到过期）
"""

DELETE_USER_DOC = """
删除指定用户（管理员）

## 权限
- 需要管理员权限
- 普通管理员不能删除超级管理员
- 超级管理员可以删除任何用户（除了自己）

## 路径参数
- `user_id`: 用户 UUID

## 返回值
- 成功：`204 No Content`（无响应体）

## 示例
```bash
# 删除指定用户
DELETE /users/123e4567-e89b-12d3-a456-426614174000
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无权限
- `404 NOT_FOUND`: 用户不存在
- `400 BAD_REQUEST`: 不能删除自己

## 注意事项
- **此操作不可逆**，用户数据将被永久删除
- 删除后，该用户的所有 token 立即失效
- 不能删除自己（防止误操作）
- 普通管理员不能删除超级管理员
- 建议在删除前确认用户创建的内容如何处理
"""
