"""
当前用户文章接口文档
"""

GET_MY_POSTS_DOC = """获取当前用户的所有文章（包括草稿）

## 权限
- 需要登录
- 只能查看自己的文章

## 查询参数
- `status`: 文章状态（draft/published/archived）
- `category_id`: 分类ID
- `tag_id`: 标签ID
- `is_featured`: 是否推荐
- `search`: 搜索关键词
- `page`: 页码（默认1）
- `size`: 每页数量（默认20，最大100）

## 返回值
```json
{
    "items": [...],
    "total": 42,
    "page": 1,
    "size": 20,
    "pages": 3
}
```

## 示例
```bash
# 获取我的所有文章（所有板块）
GET /posts/me

# 获取我的草稿
GET /posts/me?status=draft

# 获取我的已发布文章（第2页）
GET /posts/me?status=published&page=2&size=10

# 搜索我的文章
GET /posts/me?search=Python
```

## 注意事项
- 此接口返回所有板块（article + idea）的文章
- 包含草稿、已发布、已归档的所有状态
- 如果需要按板块筛选，请使用管理后台接口
- 适用于用户个人文章管理页面
"""
