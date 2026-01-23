"""
公开接口文档（无需认证）
"""

GET_PUBLIC_FILES_DOC = """获取公开文件列表

## 权限
- 无需认证，任何人都可以访问
- 仅返回 `is_public=True` 的文件

## 查询参数
- `media_type`: 文件类型过滤（image/video/audio/document）
- `usage`: 用途过滤（avatar/cover/content/general）
- `page`: 页码（默认 1）
- `page_size`: 每页数量（默认 20，最大 100）

## 返回值
```json
[
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
```

## 示例
```bash
# 获取所有公开图片
GET /media/public?media_type=image&page=1&page_size=20

# 获取公开封面图
GET /media/public?usage=cover
```

## 注意事项
- 不返回私有文件
- 不包含上传者信息（隐私保护）
- 适用于公开画廊、资源库等场景
"""
