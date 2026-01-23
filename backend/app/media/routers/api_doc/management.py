"""
文件管理接口文档（查询、更新、删除）
"""

GET_USER_FILES_DOC = """获取当前用户的媒体文件列表

## 权限
- 需要登录
- 仅返回当前用户上传的文件

## 查询参数
- `q`: 搜索关键词（可选，搜索文件名和描述）
- `media_type`: 文件类型过滤（image/video/audio/document）
- `usage`: 用途过滤（avatar/cover/content/general）
- `limit`: 返回数量（默认 20，最大 100）
- `offset`: 偏移量（默认 0）

## 返回值
```json
{
    "total": 42,
    "files": [
        {
            "id": "uuid",
            "original_filename": "example.jpg",
            "file_path": "/uploads/2026/01/example.jpg",
            "mime_type": "image/jpeg",
            "file_size": 102400,
            "media_type": "image",
            "usage": "cover",
            "is_public": true,
            "view_count": 100,
            "download_count": 10,
            "created_at": "2026-01-23T10:00:00Z"
        }
    ]
}
```

## 示例
```bash
# 获取我的所有图片
GET /media/?media_type=image

# 搜索文件
GET /media/?q=封面

# 分页获取
GET /media/?limit=20&offset=40
```

## 注意事项
- 仅返回当前用户上传的文件
- 包含公开和私有文件
- 适用于用户文件管理界面
"""

GET_FILE_DETAIL_DOC = """获取媒体文件详细信息

## 权限
- 需要登录
- 可以查看：
  - 自己上传的文件（公开或私有）
  - 其他用户的公开文件
  - 超级管理员可以查看所有文件

## 路径参数
- `file_id`: 文件 UUID

## 返回值
```json
{
    "id": "uuid",
    "original_filename": "example.jpg",
    "file_path": "/uploads/2026/01/example.jpg",
    "mime_type": "image/jpeg",
    "file_size": 102400,
    "media_type": "image",
    "usage": "cover",
    "is_public": true,
    "description": "文章封面图",
    "alt_text": "示例图片",
    "view_count": 100,
    "download_count": 10,
    "thumbnails": {
        "small": "/thumbnails/2026/01/example_small.webp",
        "medium": "/thumbnails/2026/01/example_medium.webp",
        "large": "/thumbnails/2026/01/example_large.webp"
    },
    "uploader_id": "uuid",
    "created_at": "2026-01-23T10:00:00Z",
    "updated_at": "2026-01-23T10:00:00Z"
}
```

## 示例
```bash
# 获取文件详情
GET /media/123e4567-e89b-12d3-a456-426614174000
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无权访问此文件（私有文件且非所有者）
- `404 NOT_FOUND`: 文件不存在

## 注意事项
- 包含完整的文件元数据
- 包含缩略图路径（如果是图片）
- 不会增加查看次数（仅获取元数据）
"""

SEARCH_FILES_DOC = """搜索媒体文件

## 权限
- 需要登录
- 仅搜索当前用户上传的文件

## 查询参数
- `query`: 搜索关键词（必填，搜索文件名和描述）
- `media_type`: 文件类型过滤（可选）
- `limit`: 返回数量（默认 20）
- `offset`: 偏移量（默认 0）

## 返回值
```json
{
    "total": 5,
    "files": [
        {
            "id": "uuid",
            "original_filename": "example.jpg",
            "description": "包含搜索关键词的描述",
            ...
        }
    ]
}
```

## 示例
```bash
# 搜索文件名包含 "封面" 的文件
GET /media/search?query=封面

# 搜索图片类型的文件
GET /media/search?query=logo&media_type=image
```

## 注意事项
- 搜索范围：文件名、描述、替代文本
- 搜索不区分大小写
- 支持模糊匹配
- 仅搜索当前用户的文件
"""

UPDATE_FILE_DOC = """更新媒体文件信息

## 权限
- 需要登录
- 仅文件所有者或超级管理员可以更新

## 路径参数
- `file_id`: 文件 UUID

## 请求体
```json
{
    "description": "更新后的描述",
    "alt_text": "更新后的替代文本",
    "usage": "cover",
    "is_public": true
}
```

所有字段都是可选的，仅更新提供的字段。

## 返回值
返回更新后的完整文件信息。

## 示例
```bash
# 更新文件描述
PATCH /media/123e4567-e89b-12d3-a456-426614174000
{
    "description": "新的文件描述"
}

# 修改文件公开状态
PATCH /media/123e4567-e89b-12d3-a456-426614174000
{
    "is_public": true
}
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无权修改此文件
- `404 NOT_FOUND`: 文件不存在

## 注意事项
- 不能修改文件本身，仅能修改元数据
- 修改 `usage` 不会移动文件位置
- 修改 `is_public` 会影响文件的访问权限
"""

TOGGLE_FILE_PUBLICITY_DOC = """切换文件公开状态

## 权限
- 需要登录
- 仅文件所有者或超级管理员可以操作

## 路径参数
- `file_id`: 文件 UUID

## 请求体
```json
{
    "is_public": true
}
```

## 返回值
返回更新后的完整文件信息。

## 示例
```bash
# 设置为公开
PATCH /media/123e4567-e89b-12d3-a456-426614174000/publicity
{
    "is_public": true
}

# 设置为私有
PATCH /media/123e4567-e89b-12d3-a456-426614174000/publicity
{
    "is_public": false
}
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无权修改此文件
- `404 NOT_FOUND`: 文件不存在

## 注意事项
- 公开文件可以被任何登录用户访问
- 私有文件仅所有者和超级管理员可以访问
- 修改公开状态不会影响文件的物理位置
- 适用于快速切换文件的访问权限
"""

DELETE_FILE_DOC = """删除媒体文件

## 权限
- 需要登录
- 仅文件所有者或超级管理员可以删除

## 路径参数
- `file_id`: 文件 UUID

## 返回值
- 成功：204 No Content（无响应体）

## 示例
```bash
# 删除文件
DELETE /media/123e4567-e89b-12d3-a456-426614174000
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无权删除此文件
- `404 NOT_FOUND`: 文件不存在
- `409 CONFLICT`: 文件正在被使用（如作为文章封面）

## 注意事项
- 删除操作会同时删除：
  - 数据库记录
  - 原始文件
  - 所有缩略图
- 删除操作不可逆
- 如果文件正在被文章引用，删除会失败
- 建议在删除前检查文件的使用情况
"""

BATCH_DELETE_FILES_DOC = """批量删除媒体文件

## 权限
- 需要登录
- 仅能删除自己上传的文件
- 超级管理员可以删除任何文件

## 请求体
```json
{
    "file_ids": [
        "123e4567-e89b-12d3-a456-426614174000",
        "223e4567-e89b-12d3-a456-426614174001"
    ]
}
```

## 返回值
```json
{
    "message": "批量删除完成",
    "deleted_count": 2
}
```

## 示例
```bash
# 批量删除文件
POST /media/batch-delete
{
    "file_ids": ["uuid1", "uuid2", "uuid3"]
}
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 部分文件无权删除（会跳过这些文件）
- `404 NOT_FOUND`: 部分文件不存在（会跳过这些文件）

## 注意事项
- 删除操作是原子性的（全部成功或全部失败）
- 如果某个文件无权删除，整个操作会失败
- 删除会同时删除文件和缩略图
- 适用于文件管理界面的批量操作
"""
