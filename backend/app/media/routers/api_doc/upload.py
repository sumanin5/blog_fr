"""
文件上传接口文档
"""

UPLOAD_FILE_DOC = """上传媒体文件

## 权限
- 需要登录
- 所有登录用户都可以上传文件

## 表单参数
- `file`: 文件（必填，multipart/form-data）
- `usage`: 文件用途（可选，默认 general）
  - `avatar`: 用户头像
  - `cover`: 文章封面
  - `content`: 文章内容图片
  - `general`: 通用文件
- `is_public`: 是否公开（可选，默认 false）
- `description`: 文件描述（可选）
- `alt_text`: 替代文本（可选，用于无障碍访问）

## 返回值
```json
{
    "message": "文件上传成功",
    "file": {
        "id": "uuid",
        "original_filename": "example.jpg",
        "file_path": "/uploads/2026/01/example.jpg",
        "mime_type": "image/jpeg",
        "file_size": 102400,
        "media_type": "image",
        "thumbnails": {
            "small": "/thumbnails/2026/01/example_small.webp",
            "medium": "/thumbnails/2026/01/example_medium.webp",
            "large": "/thumbnails/2026/01/example_large.webp"
        }
    }
}
```

## 示例
```bash
# 上传文章封面图
curl -X POST /media/upload \\
  -H "Authorization: Bearer <token>" \\
  -F "file=@cover.jpg" \\
  -F "usage=cover" \\
  -F "is_public=true" \\
  -F "description=文章封面图"

# 上传用户头像
curl -X POST /media/upload \\
  -H "Authorization: Bearer <token>" \\
  -F "file=@avatar.png" \\
  -F "usage=avatar" \\
  -F "is_public=true"
```

## 错误码
- `400 BAD_REQUEST`: 文件类型不支持、文件过大
- `401 UNAUTHORIZED`: 未登录
- `413 PAYLOAD_TOO_LARGE`: 文件超过大小限制
- `500 INTERNAL_SERVER_ERROR`: 文件保存失败

## 注意事项
- 支持的文件类型：图片（jpg/png/gif/webp）、视频（mp4/webm）、音频（mp3/wav）、文档（pdf）
- 文件大小限制：图片 10MB，视频 100MB，其他 50MB
- 图片会自动生成缩略图（small/medium/large）
- 文件名会自动重命名为 UUID，避免冲突
- 文件按日期分目录存储（/uploads/YYYY/MM/）
"""
