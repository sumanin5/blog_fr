"""
个人中心相关 API 文档

包含获取、更新、删除当前用户信息的接口文档。
"""

GET_ME_DOC = """
获取当前登录用户信息

## 权限
- 需要登录
- 返回当前 token 对应的用户信息

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
# 获取当前用户信息
curl -X GET http://localhost:8000/api/v1/users/me \\
  -H "Authorization: Bearer <your_token>"
```

## 错误码
- `401 UNAUTHORIZED`: 未登录或 token 无效
- `401 UNAUTHORIZED`: Token 已过期

## 注意事项
- 不返回密码字段
- 可用于验证 token 是否有效
- 适用于前端获取当前登录用户信息
"""

UPDATE_ME_DOC = """
更新当前用户信息

## 权限
- 需要登录
- 只能更新自己的信息

## 请求体
```json
{
    "email": "newemail@example.com",
    "full_name": "New Name",
    "password": "newpassword123"
}
```

**所有字段都是可选的**，只更新提供的字段。

## 字段说明
- `email`: 新邮箱地址（可选，必须唯一）
- `full_name`: 新全名（可选）
- `password`: 新密码（可选，至少 6 个字符）

## 返回值
返回更新后的用户对象（不包含密码）。

## 示例
```bash
# 更新邮箱
curl -X PATCH http://localhost:8000/api/v1/users/me \\
  -H "Authorization: Bearer <your_token>" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "newemail@example.com"}'

# 更新密码
curl -X PATCH http://localhost:8000/api/v1/users/me \\
  -H "Authorization: Bearer <your_token>" \\
  -H "Content-Type: application/json" \\
  -d '{"password": "newpassword123"}'

# 同时更新多个字段
curl -X PATCH http://localhost:8000/api/v1/users/me \\
  -H "Authorization: Bearer <your_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "newemail@example.com",
    "full_name": "New Name",
    "password": "newpassword123"
  }'
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `400 BAD_REQUEST`: 邮箱已被其他用户使用
- `422 UNPROCESSABLE_ENTITY`: 数据验证失败

## 注意事项
- 不能修改用户名（username 是唯一标识）
- 不能修改权限字段（is_admin, is_superadmin）
- 修改密码后，旧 token 仍然有效（直到过期）
- 新密码会自动加密存储
"""

DELETE_ME_DOC = """
删除当前用户账号

## 权限
- 需要登录
- 只能删除自己的账号

## 返回值
- 成功：`204 No Content`（无响应体）

## 示例
```bash
# 删除当前用户账号
curl -X DELETE http://localhost:8000/api/v1/users/me \\
  -H "Authorization: Bearer <your_token>"
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 超级管理员不能删除自己（保护措施）

## 注意事项
- **此操作不可逆**，用户数据将被永久删除
- 删除后，该用户的所有 token 立即失效
- 用户创建的内容（文章、评论等）可能会被保留或转移（取决于业务逻辑）
- 建议在删除前提示用户确认
- 超级管理员账号不能自我删除（防止误操作）
"""
