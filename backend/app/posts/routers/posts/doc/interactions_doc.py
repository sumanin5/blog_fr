"""
互动接口文档（点赞、收藏）
"""

LIKE_POST_DOC = """点赞文章（增加点赞数）

## 权限
- 无需认证，任何人都可以点赞
- 不记录点赞用户，仅统计点赞总数

## 路径参数
- `post_type`: 板块类型（article/idea）
- `post_id`: 文章 UUID

## 返回值
```json
{
    "like_count": 42
}
```

## 示例
```bash
# 点赞文章
POST /posts/article/123e4567-e89b-12d3-a456-426614174000/like

# 响应
{
    "like_count": 43
}
```

## 错误码
- `404 NOT_FOUND`: 文章不存在
- `500 INTERNAL_SERVER_ERROR`: 数据库更新失败

## 注意事项
- 不验证用户身份，允许重复点赞
- 点赞数不会减少到负数
- 建议前端实现防抖，避免重复请求
"""

UNLIKE_POST_DOC = """取消点赞（减少点赞数）

## 权限
- 无需认证，任何人都可以取消点赞
- 不记录点赞用户，仅统计点赞总数

## 路径参数
- `post_type`: 板块类型（article/idea）
- `post_id`: 文章 UUID

## 返回值
```json
{
    "like_count": 41
}
```

## 示例
```bash
# 取消点赞
DELETE /posts/article/123e4567-e89b-12d3-a456-426614174000/like

# 响应
{
    "like_count": 42
}
```

## 错误码
- `404 NOT_FOUND`: 文章不存在
- `500 INTERNAL_SERVER_ERROR`: 数据库更新失败

## 注意事项
- 点赞数不会减少到负数（最小为 0）
- 建议前端实现防抖，避免重复请求
"""

BOOKMARK_POST_DOC = """收藏文章（增加收藏数）

## 权限
- 无需认证，任何人都可以收藏
- 不记录收藏用户，仅统计收藏总数

## 路径参数
- `post_type`: 板块类型（article/idea）
- `post_id`: 文章 UUID

## 返回值
```json
{
    "bookmark_count": 15
}
```

## 示例
```bash
# 收藏文章
POST /posts/article/123e4567-e89b-12d3-a456-426614174000/bookmark

# 响应
{
    "bookmark_count": 16
}
```

## 错误码
- `404 NOT_FOUND`: 文章不存在
- `500 INTERNAL_SERVER_ERROR`: 数据库更新失败

## 注意事项
- 不验证用户身份，允许重复收藏
- 收藏数不会减少到负数
- 建议前端实现防抖，避免重复请求
- 如需实现用户收藏列表，需要额外的用户收藏关系表
"""

UNBOOKMARK_POST_DOC = """取消收藏（减少收藏数）

## 权限
- 无需认证，任何人都可以取消收藏
- 不记录收藏用户，仅统计收藏总数

## 路径参数
- `post_type`: 板块类型（article/idea）
- `post_id`: 文章 UUID

## 返回值
```json
{
    "bookmark_count": 14
}
```

## 示例
```bash
# 取消收藏
DELETE /posts/article/123e4567-e89b-12d3-a456-426614174000/bookmark

# 响应
{
    "bookmark_count": 15
}
```

## 错误码
- `404 NOT_FOUND`: 文章不存在
- `500 INTERNAL_SERVER_ERROR`: 数据库更新失败

## 注意事项
- 收藏数不会减少到负数（最小为 0）
- 建议前端实现防抖，避免重复请求
"""
