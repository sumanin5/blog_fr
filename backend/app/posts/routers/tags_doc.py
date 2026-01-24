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
# 动态路由 - 必须放在最后
# ========================================

LIST_TAGS_BY_TYPE_DOC = """获取指定板块的标签列表（自动分页）

## 权限
- 公开接口，无需认证

## 示例
```bash
# 获取文章标签
GET /posts/article/tags

# 获取想法标签
GET /posts/idea/tags
```

## 注意事项
- 包含标签下的文章数量统计
- 按使用频率排序
"""
