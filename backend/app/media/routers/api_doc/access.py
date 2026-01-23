"""
文件访问接口文档（查看、下载）
"""

VIEW_FILE_DOC = """查看媒体文件（返回文件内容）

## 权限
- 需要登录
- 可以查看：
  - 自己上传的文件
  - 其他用户的公开文件
  - 超级管理员可以查看所有文件

## 路径参数
- `file_id`: 文件 UUID

## 返回值
- 直接返回文件内容（二进制流）
- Content-Type 根据文件类型自动设置
- 包含缓存头（Cache-Control, ETag）

## 示例
```bash
# 在浏览器中查看图片
GET /media/123e4567-e89b-12d3-a456-426614174000/view

# 在 img 标签中使用
<img src="/media/123e4567-e89b-12d3-a456-426614174000/view" />
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无权访问此文件
- `404 NOT_FOUND`: 文件不存在或文件已被删除

## 注意事项
- 每次访问会增加查看次数（view_count +1）
- 返回原始文件，不是缩略图
- 包含缓存头，浏览器会缓存文件
- 适用于在网页中直接显示文件
"""

VIEW_THUMBNAIL_DOC = """查看缩略图（返回缩略图内容）

## 权限
- 需要登录
- 权限规则同查看原文件

## 路径参数
- `file_id`: 文件 UUID
- `size`: 缩略图尺寸
  - `small`: 150x150px
  - `medium`: 300x300px
  - `large`: 600x600px

## 返回值
- 直接返回缩略图内容（WebP 格式）
- Content-Type: image/webp
- 包含缓存头

## 示例
```bash
# 获取小尺寸缩略图
GET /media/123e4567-e89b-12d3-a456-426614174000/thumbnail/small

# 在 img 标签中使用
<img src="/media/{file_id}/thumbnail/medium" />
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无权访问此文件
- `404 NOT_FOUND`: 文件不存在或缩略图不存在
- `400 BAD_REQUEST`: 不支持的尺寸或文件类型不是图片

## 注意事项
- 仅图片文件有缩略图
- 缩略图格式统一为 WebP（高压缩率）
- 缩略图会在上传时自动生成
- 如果缩略图丢失，可以使用重新生成接口
- 不会增加查看次数（仅原文件会统计）
"""

DOWNLOAD_FILE_DOC = """下载媒体文件

## 权限
- 需要登录
- 权限规则同查看文件

## 路径参数
- `file_id`: 文件 UUID

## 返回值
- 直接返回文件内容（二进制流）
- Content-Disposition: attachment（触发浏览器下载）
- 文件名为原始文件名

## 示例
```bash
# 下载文件
GET /media/123e4567-e89b-12d3-a456-426614174000/download

# 使用 curl 下载
curl -O -J /media/123e4567-e89b-12d3-a456-426614174000/download
```

## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无权访问此文件
- `404 NOT_FOUND`: 文件不存在或文件已被删除

## 注意事项
- 每次下载会增加下载次数（download_count +1）
- 与 `/view` 的区别：
  - `/view`: 在浏览器中显示（Content-Disposition: inline）
  - `/download`: 触发下载（Content-Disposition: attachment）
- 保留原始文件名
- 适用于用户主动下载文件的场景
"""
