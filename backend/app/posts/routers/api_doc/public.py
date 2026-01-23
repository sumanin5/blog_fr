"""
公开接口文档（无需认证）
"""

GET_POST_TYPES_DOC = """获取所有板块类型（用于前端构建菜单）

返回示例：
```json
[
    {"value": "article", "label": "Article"},
    {"value": "idea", "label": "Idea"}
]
```
"""

LIST_POSTS_BY_TYPE_DOC = """获取指定板块的文章列表（自动分页）

## 权限
- 公开接口，无需认证
- 只显示已发布的文章

## 查询参数
- `category_id`: 分类ID（可选）
- `tag_id`: 标签ID（可选）
- `author_id`: 作者ID（可选）
- `is_featured`: 是否推荐（可选）
- `search`: 搜索关键词（可选）
- `page`: 页码（默认1）
- `size`: 每页数量（默认20，最大100）

## 示例
```bash
# 获取文章列表
GET /posts/article?page=1&size=20

# 获取想法列表
GET /posts/idea?page=1&size=20

# 按分类筛选
GET /posts/article?category_id=xxx

# 搜索文章
GET /posts/article?search=Python
```

## 注意事项
- 仅返回已发布的文章（status=published）
- 支持多条件组合筛选
- 返回结果包含分页信息
"""

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

GET_POST_BY_ID_DOC = """根据 UUID 获取文章详情并增加浏览量

## 权限
- 已发布文章：任何人可访问（包括未登录）
- 草稿文章：只有作者或超级管理员可访问

## 路径参数
- `post_type`: 板块类型（article/idea）
- `post_id`: 文章UUID

## 查询参数
- `include_mdx`: 是否包含原始 MDX 内容（用于编辑）
  - `false`（默认）: 返回 AST（节省带宽）
  - `true`: 返回 MDX（用于编辑）

## 返回值
```json
{
    "id": "uuid",
    "title": "文章标题",
    "slug": "article-slug",
    "content_ast": {...},  // 或 content_mdx
    "toc": [...],
    "reading_time": 5,
    "excerpt": "摘要",
    "status": "published",
    "view_count": 100,
    "like_count": 10,
    "bookmark_count": 5,
    "created_at": "2026-01-23T10:00:00Z",
    "updated_at": "2026-01-23T10:00:00Z"
}
```

## 示例
```bash
# 查看文章
GET /posts/article/550e8400-e29b-41d4-a716-446655440000

# 编辑模式（获取 MDX）
GET /posts/article/550e8400-e29b-41d4-a716-446655440000?include_mdx=true
```

## 错误码
- `403 FORBIDDEN`: 无权访问（草稿文章且非作者）
- `404 NOT_FOUND`: 文章不存在

## 注意事项
- 每次访问会增加浏览次数（view_count +1）
- 使用 :uuid 路径转换器确保与 slug 路由不冲突
- 根据 enable_jsx 字段决定返回 AST 还是 MDX
"""

GET_POST_BY_SLUG_DOC = """根据 Slug 获取文章详情并增加浏览量

## 权限
- 已发布文章：任何人可访问（包括未登录）
- 草稿文章：只有作者或超级管理员可访问

## 路径参数
- `post_type`: 板块类型（article/idea）
- `slug`: 文章Slug（URL别名）

## 示例
```bash
# 通过 Slug 访问文章
GET /posts/article/slug/my-post-slug

# 通过 Slug 访问想法
GET /posts/idea/slug/my-idea-slug
```

## 错误码
- `403 FORBIDDEN`: 无权访问（草稿文章且非作者）
- `404 NOT_FOUND`: 文章不存在或 Slug 不匹配

## 注意事项
- 使用 /slug/ 前缀明确区分 UUID 和 Slug 路由
- Slug 必须在同一板块内唯一
- 每次访问会增加浏览次数
"""
