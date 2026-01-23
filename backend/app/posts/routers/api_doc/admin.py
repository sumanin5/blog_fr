"""
管理员接口文档（文章管理、标签管理、分类管理）
"""

# ========================================
# 文章管理
# ========================================

LIST_POSTS_BY_TYPE_ADMIN_DOC = """获取指定板块的文章列表（管理后台）

## 权限
- 超级管理员：可以查看所有文章（包括所有用户的草稿）
- 普通用户：只能查看自己的文章

## 路径参数
- `post_type`: 板块类型（article/idea）

## 查询参数
- `status`: 文章状态（draft/published/archived）
- `category_id`: 分类ID
- `tag_id`: 标签ID
- `author_id`: 作者ID（超级管理员可用）
- `is_featured`: 是否推荐
- `search`: 搜索关键词
- `page`: 页码（默认1）
- `size`: 每页数量（默认20，最大100）

## 示例
```bash
# 获取所有文章（article 板块）
GET /posts/article/admin/posts

# 获取草稿列表
GET /posts/article/admin/posts?status=draft

# 获取指定作者的想法（超级管理员）
GET /posts/idea/admin/posts?author_id=xxx
```

## 注意事项
- 普通用户自动过滤为自己的文章
- 超级管理员可以查看所有用户的文章
- 包含所有状态的文章（草稿、已发布、已归档）
"""

LIST_ALL_POSTS_ADMIN_DOC = """获取所有文章列表（管理后台，跨板块）

## 权限
- 超级管理员：可以查看所有文章（包括所有用户的草稿）
- 普通用户：只能查看自己的文章

## 查询参数
- `status`: 文章状态（draft/published/archived）
- `category_id`: 分类ID
- `tag_id`: 标签ID
- `author_id`: 作者ID（超级管理员可用）
- `is_featured`: 是否推荐
- `search`: 搜索关键词
- `page`: 页码（默认1）
- `size`: 每页数量（默认20，最大100）

## 示例
```bash
# 获取所有板块的所有文章
GET /posts/admin/posts

# 获取所有板块的草稿列表
GET /posts/admin/posts?status=draft

# 全局搜索
GET /posts/admin/posts?search=Python
```

## 注意事项
- 此接口返回 article 和 idea 混合的结果
- 适合全局搜索和管理
- 普通用户自动过滤为自己的文章
"""

# ========================================
# 标签管理
# ========================================

LIST_TAGS_DOC = """获取所有标签列表（支持搜索）

## 权限
- 需要登录

## 查询参数
- `search`: 搜索关键词，支持标签名称模糊搜索
- `page`: 页码（默认1）
- `size`: 每页数量（默认20，最大100）

## 返回值
```json
{
    "items": [
        {
            "id": "uuid",
            "name": "Python",
            "slug": "python",
            "post_count": 42
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
# 获取所有标签
GET /posts/admin/tags

# 搜索标签
GET /posts/admin/tags?search=Python
```

## 注意事项
- 包含标签下的文章数量统计
- 按使用频率排序
"""

DELETE_ORPHANED_TAGS_DOC = """删除孤立标签（仅超级管理员）

## 权限
- 需要超级管理员权限

## 功能说明
- 删除没有关联任何文章的标签
- 清理数据库中的冗余数据

## 返回值
```json
{
    "deleted_count": 5,
    "deleted_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "message": "已删除 5 个孤立标签"
}
```

## 示例
```bash
DELETE /posts/admin/tags/orphaned
```

## 注意事项
- 删除操作不可恢复
- 建议定期执行以清理数据
- 不会影响有文章关联的标签
"""

MERGE_TAGS_DOC = """合并标签（仅超级管理员）

## 权限
- 需要超级管理员权限

## 功能说明
- 将源标签的所有文章关联转移到目标标签
- 删除源标签
- 用于合并重复或相似的标签

## 请求体
```json
{
    "source_tag_id": "uuid",
    "target_tag_id": "uuid"
}
```

## 返回值
- 返回目标标签对象（包含更新后的文章数量）

## 示例
```bash
POST /posts/admin/tags/merge
Content-Type: application/json

{
    "source_tag_id": "550e8400-e29b-41d4-a716-446655440000",
    "target_tag_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 权限不足（非超级管理员）
- `404 NOT_FOUND`: 标签不存在

## 注意事项
- 源标签会被删除
- 所有关联会转移到目标标签
- 不会产生重复关联
"""

UPDATE_TAG_DOC = """更新标签（仅超级管理员）

## 权限
- 需要超级管理员权限

## 路径参数
- `tag_id`: 标签ID（UUID格式）

## 请求体
```json
{
    "name": "新标签名",
    "slug": "new-tag-slug"
}
```

## 返回值
- 返回更新后的标签对象

## 示例
```bash
PATCH /posts/admin/tags/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
    "name": "Python 3"
}
```

## 错误码
- `400 BAD_REQUEST`: Slug已存在
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 权限不足（非超级管理员）
- `404 NOT_FOUND`: 标签不存在

## 注意事项
- 所有字段都是可选的
- 更新 slug 会影响 URL
"""

# ========================================
# 分类管理
# ========================================

CREATE_CATEGORY_DOC = """创建新分类（仅超级管理员）

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

UPDATE_CATEGORY_DOC = """更新分类（仅超级管理员）

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

DELETE_CATEGORY_DOC = """删除分类（仅超级管理员）

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
