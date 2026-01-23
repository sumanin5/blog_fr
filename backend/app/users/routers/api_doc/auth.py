"""
用户认证相关 API 文档

包含注册、登录等公开接口的文档。
"""

REGISTER_DOC = """
注册新用户账号

## 权限
- 公开接口，无需登录

## 请求体
```json
{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword123",
    "full_name": "John Doe"
}
```

## 字段说明
- `username`: 用户名（3-50字符，唯一，只能包含字母、数字、下划线）
- `email`: 邮箱地址（唯一，必须是有效的邮箱格式）
- `password`: 密码（至少6个字符）
- `full_name`: 全名（可选，最多100字符）

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
    "created_at": "2026-01-23T10:00:00Z"
}
```

- 创建成功的用户对象（不包含密码）
- 默认权限：普通用户（`is_admin=false`, `is_superadmin=false`）
- 默认状态：激活（`is_active=true`）

## 示例
```bash
# 注册新用户
curl -X POST http://localhost:8000/api/v1/users/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword123",
    "full_name": "John Doe"
  }'
```

## 错误码
- `400 BAD_REQUEST`: 用户名或邮箱已存在
- `422 UNPROCESSABLE_ENTITY`: 数据验证失败（格式不正确）

## 注意事项
- 密码会自动加密存储（使用 bcrypt）
- 注册后需要使用 `/login` 接口获取 token
- 用户名不区分大小写，但会保留原始大小写
"""

LOGIN_DOC = """
用户登录获取访问令牌

## 权限
- 公开接口，无需登录

## 请求体（Form Data）
- `username`: 用户名或邮箱（必填）
- `password`: 密码（必填）

**注意**：请求格式为 `application/x-www-form-urlencoded`（OAuth2 标准）

## 返回值
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
}
```

## 使用方式
1. 调用此接口获取 `access_token`
2. 在后续请求的 Header 中添加：`Authorization: Bearer {access_token}`

## 示例
```bash
# 使用用户名登录
curl -X POST http://localhost:8000/api/v1/users/login \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "username=johndoe&password=securepassword123"

# 使用邮箱登录
curl -X POST http://localhost:8000/api/v1/users/login \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "username=john@example.com&password=securepassword123"

# 使用返回的 token 访问受保护接口
curl -X GET http://localhost:8000/api/v1/users/me \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 错误码
- `400 BAD_REQUEST`: 用户名或密码错误
- `400 BAD_REQUEST`: 用户账号未激活

## 注意事项
- Token 有效期为 30 天
- 支持使用用户名或邮箱登录
- 密码错误次数过多可能导致账号临时锁定（如果启用了安全策略）
"""
