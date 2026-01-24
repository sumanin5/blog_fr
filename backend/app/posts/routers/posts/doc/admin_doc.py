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
