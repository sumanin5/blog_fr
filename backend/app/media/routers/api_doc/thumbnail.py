"""
缩略图管理接口文档
"""

REGENERATE_THUMBNAILS_DOC = """重新生成缩略图

## 权限
- 需要登录
- 仅文件所有者或超级管理员可以操作

## 路径参数
- `file_id`: 文件 UUID

## 返回值
```json
{
    "message": "缩略图重新生成成功",
    "thumbnails": {
        "small": "/thumbnails/2026/01/example_small.webp",
        "medium": "/thumbnails/2026/01/example_medium.webp",
        "large": "/thumbnails/2026/01/example_large.webp"
    }
}
```

## 示例
```bash
# 重新生成缩略图
POST /media/123e4567-e89b-12d3-a456-426614174000/regenerate-thumbnails
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无权操作此文件
- `404 NOT_FOUND`: 文件不存在
- `400 BAD_REQUEST`: 文件类型不是图片

## 注意事项
- 仅图片文件可以生成缩略图
- 会删除旧的缩略图并生成新的
- 适用场景：
  - 缩略图丢失或损坏
  - 更新缩略图生成算法后重新生成
  - 原图被替换后需要更新缩略图
"""
