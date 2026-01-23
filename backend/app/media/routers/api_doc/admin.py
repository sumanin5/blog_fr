"""
管理员接口文档
"""

GET_ALL_FILES_ADMIN_DOC = """获取系统中所有媒体文件

## 权限
- 需要管理员权限（is_superadmin=True）

## 查询参数
- `media_type`: 文件类型过滤（可选）
- `usage`: 用途过滤（可选）
- `limit`: 返回数量（默认 20，最大 100）
- `offset`: 偏移量（默认 0）

## 返回值
```json
{
    "total": 150,
    "files": [
        {
            "id": "uuid",
            "original_filename": "example.jpg",
            "uploader_id": "user-uuid",
            "is_public": true,
            ...
        }
    ]
}
```

## 示例
```bash
# 获取所有文件
GET /media/admin/all

# 获取所有图片
GET /media/admin/all?media_type=image

# 分页获取
GET /media/admin/all?limit=50&offset=100
```

## 注意事项
- 返回所有用户上传的文件
- 包含公开和私有文件
- 包含上传者信息
- 适用于管理后台的文件管理
"""
