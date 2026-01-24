# ========================================
# 分类管理
# ========================================

CREATE_CATEGORY_BY_TYPE_DOC = """创建新分类（仅超级管理员）

## 权限
- 需要超级管理员权限

## 路径参数
- `post_type`: 板块类型（article/idea）

## 请求体
```json
{
    "name": "分类名称",
    "slug": "category-slug",
    "description": "分类描述",
    "is_active": true
}
```

## 字段说明
- `name`: 分类名称（必填）
- `slug`: URL别名（可选，自动生成）
- `description`: 分类描述（可选）
- `is_active`: 是否启用（默认true）

## 示例
```bash
# 创建文章分类
POST /posts/article/categories
Content-Type: application/json

{
    "name": "技术文章",
    "description": "技术相关的文章"
}

# 创建想法分类
POST /posts/idea/categories
Content-Type: application/json

{
    "name": "随笔"
}
```

## 错误码
- `400 BAD_REQUEST`: Slug已存在
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 权限不足（非超级管理员）

## 注意事项
- Slug 必须在同一板块内唯一
- 如果不提供 slug，会自动生成
"""

UPDATE_CATEGORY_BY_TYPE_DOC = """更新分类（仅超级管理员）

## 权限
- 需要超级管理员权限

## 路径参数
- `post_type`: 板块类型（article/idea）
- `category_id`: 分类ID（UUID格式）

## 请求体（所有字段都是可选的）
```json
{
    "name": "新分类名",
    "slug": "new-slug",
    "description": "新描述",
    "is_active": false
}
```

## 示例
```bash
# 更新分类名称
PATCH /posts/article/categories/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
    "name": "技术博客"
}

# 禁用分类
PATCH /posts/article/categories/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
    "is_active": false
}
```

## 错误码
- `400 BAD_REQUEST`: Slug已被其他分类使用
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 权限不足（非超级管理员）
- `404 NOT_FOUND`: 分类不存在

## 注意事项
- 禁用分类不会影响已关联的文章
- 禁用的分类不会在公开接口中显示
"""

DELETE_CATEGORY_BY_TYPE_DOC = """删除分类（仅超级管理员）

## 权限
- 需要超级管理员权限

## 路径参数
- `post_type`: 板块类型（article/idea）
- `category_id`: 分类ID（UUID格式）

## 返回值
- 204 No Content（无响应体）

## 示例
```bash
# 删除文章分类
DELETE /posts/article/categories/550e8400-e29b-41d4-a716-446655440000

# 删除想法分类
DELETE /posts/idea/categories/550e8400-e29b-41d4-a716-446655440000
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 权限不足（非超级管理员）
- `404 NOT_FOUND`: 分类不存在
- `409 CONFLICT`: 分类下还有文章（需要先移除关联）

## 注意事项
- 删除操作不可恢复
- 如果分类下有文章，删除会失败
- 建议先将文章移到其他分类或取消关联
"""

# ========================================
# 动态路由 - 必须放在最后
# ========================================

LIST_CATEGORIES_BY_TYPE_DOC = """获取指定板块的分类列表（自动分页）

## 权限
- 公开接口，无需认证

## 查询参数
- `include_inactive`: 是否包含未启用的分类（默认false）

## 示例
```bash
# 获取文章分类（仅启用）
GET /posts/article/categories

# 获取所有分类
GET /posts/article/categories?include_inactive=true
```

## 注意事项
- 默认只返回启用的分类（is_active=true）
- 包含分类下的文章数量统计
"""
