"""
统计接口文档
"""

GET_STATS_OVERVIEW_DOC = """获取用户媒体文件统计概览

## 权限
- 需要登录
- 仅返回当前用户的统计数据

## 返回值
```json
{
    "total_files": 42,
    "total_size": 10485760,
    "by_type": {
        "image": 30,
        "video": 5,
        "audio": 2,
        "document": 5
    },
    "by_usage": {
        "avatar": 1,
        "cover": 10,
        "content": 25,
        "general": 6
    },
    "public_files": 20,
    "private_files": 22
}
```

## 示例
```bash
# 获取统计概览
GET /media/stats/overview
```

## 注意事项
- 统计数据实时计算
- `total_size` 单位为字节
- 适用于用户仪表板显示
"""
