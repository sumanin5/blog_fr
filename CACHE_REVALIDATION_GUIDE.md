# Next.js 缓存自动失效配置指南

## 📋 概述

本指南说明如何配置后端 Git 同步完成后，自动失效 Next.js 前端缓存，确保用户立即看到最新内容。

## 🎯 解决的问题

**问题**：

- 后端通过 Git 同步更新文章到数据库
- Next.js 前端配置了 1 小时缓存（`revalidate: 3600`）
- 用户访问时看到的是旧缓存，需要等 1 小时才能看到新文章

**解决方案**：

- 后端同步完成后，自动调用 Next.js API 失效缓存
- 用户立即看到最新内容（秒级延迟）
- 保持缓存优势（99% 的访问仍使用缓存）

## 🏗️ 架构

```
Git Push → 后端同步 → 数据库更新 → 调用 Next.js API → 失效缓存 → 用户看到新内容
```

## 📝 配置步骤

### 1. 生成密钥

```bash
# 生成一个随机密钥（32字节）
openssl rand -hex 32
```

复制生成的密钥，例如：`a1b2c3d4e5f6...`

### 2. 配置后端环境变量

编辑 `backend/.env` 或 `.env.local`：

```bash
# Next.js 缓存失效配置
FRONTEND_URL=http://localhost:3000
REVALIDATE_SECRET=a1b2c3d4e5f6...  # 使用你生成的密钥
```

**生产环境**：

```bash
FRONTEND_URL=https://your-domain.com
REVALIDATE_SECRET=your-production-secret
```

### 3. 配置前端环境变量

编辑 `frontend/.env.local`：

```bash
# 缓存失效 API 密钥（必须与后端一致）
REVALIDATE_SECRET=a1b2c3d4e5f6...  # 与后端相同的密钥
```

### 4. 重启服务

```bash
# 重启后端
cd backend
# 如果使用 Docker
docker-compose restart backend
# 或直接运行
uvicorn app.main:app --reload

# 重启前端
cd frontend
npm run dev
```

## 🧪 测试

### 1. 手动测试缓存失效 API

```bash
# 测试 Next.js API（使用你的密钥）
curl -X POST http://localhost:3000/api/revalidate \
  -H "Authorization: Bearer a1b2c3d4e5f6..." \
  -H "Content-Type: application/json" \
  -d '{"tags": ["posts"], "paths": ["/posts"]}'

# 预期响应
{
  "success": true,
  "revalidated": {
    "tags": ["posts"],
    "paths": ["/posts"]
  },
  "timestamp": "2025-01-14T10:30:00.000Z"
}
```

### 2. 测试完整流程

```bash
# 1. 添加新文章到 Git
cd content
echo "---
title: Test Post
author: admin
---
# Test Content" > test-post.md

git add test-post.md
git commit -m "Add test post"
git push

# 2. 触发后端同步（需要管理员 Token）
curl -X POST http://localhost:8000/api/v1/ops/git/sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 3. 检查后端日志
# 应该看到：✅ Next.js cache revalidated successfully

# 4. 访问前端
curl http://localhost:3000/posts
# 应该立即看到新文章
```

## 📊 工作流程

### 正常访问（使用缓存）

```
用户访问 /posts
    ↓
Next.js 检查缓存
    ↓
缓存命中（1小时内）
    ↓
直接返回 HTML（1ms）⚡
```

### Git 同步后（失效缓存）

```
管理员 Git Push
    ↓
触发后端同步
    ↓
更新数据库 ✅
    ↓
调用 Next.js API
    ↓
失效缓存 ✅
    ↓
下次访问重新渲染
    ↓
用户看到新内容 ✅
```

## 🔍 故障排查

### 问题 1：401 Unauthorized

**原因**：密钥不匹配或未配置

**解决**：

1. 检查前后端的 `REVALIDATE_SECRET` 是否一致
2. 确认环境变量已加载（重启服务）
3. 检查密钥中是否有多余的空格或换行

### 问题 2：Cannot connect to Next.js

**原因**：前端未启动或 URL 错误

**解决**：

1. 确认前端正在运行：`curl http://localhost:3000`
2. 检查 `FRONTEND_URL` 配置是否正确
3. 检查防火墙或网络配置

### 问题 3：缓存未失效

**原因**：API 调用失败或 tags 不匹配

**解决**：

1. 查看后端日志，确认是否有错误信息
2. 检查前端日志：`✅ Revalidated tag: posts`
3. 确认文章页面使用了正确的 tags：
   ```typescript
   fetch(url, {
     next: {
       tags: ["posts", "posts-list"], // 必须匹配
     },
   });
   ```

### 问题 4：Timeout

**原因**：前端响应慢或网络问题

**解决**：

1. 增加超时时间（默认 10 秒）
2. 检查前端性能
3. 使用异步调用（不阻塞同步流程）

## 📈 性能影响

### 对比数据

| 指标       | 无缓存   | 短缓存(5 分钟) | 长缓存+失效(推荐) |
| ---------- | -------- | -------------- | ----------------- |
| 响应时间   | 50-100ms | 1-5ms          | 1-5ms             |
| 数据库查询 | 每次访问 | 每 5 分钟      | 每小时+手动       |
| 更新延迟   | 立即     | 最多 5 分钟    | 秒级              |
| 服务器负载 | 高       | 中             | 极低              |

### 实际案例

假设每天 1000 次访问，每周发布 2 篇文章：

**数据库查询次数**：

- 无缓存：1000 次/天 × 7 天 = 7000 次/周
- 长缓存+失效：24 次/天 × 7 天 + 2 次 = 170 次/周

**节省**：97.6% 的数据库查询

## 🔒 安全性

### 密钥管理

1. **生产环境必须使用强密钥**

   ```bash
   # 生成 32 字节随机密钥
   openssl rand -hex 32
   ```

2. **不要提交密钥到 Git**

   - `.env` 和 `.env.local` 已在 `.gitignore` 中
   - 使用环境变量或密钥管理服务

3. **定期轮换密钥**
   - 建议每 3-6 个月更换一次
   - 更换后需要同时更新前后端配置

### API 保护

- ✅ Bearer Token 认证
- ✅ 密钥验证
- ✅ 错误日志记录
- ✅ 超时保护（10 秒）

## 📚 相关文件

### 前端

- `frontend/src/app/api/revalidate/route.ts` - 缓存失效 API
- `frontend/src/app/posts/page.tsx` - 文章列表页（配置了缓存）
- `frontend/src/app/posts/[slug]/page.tsx` - 文章详情页（配置了缓存）
- `frontend/.env.example` - 环境变量示例

### 后端

- `backend/app/git_ops/service.py` - Git 同步服务（调用失效 API）
- `backend/app/core/config.py` - 配置文件（新增字段）
- `backend/.env.example` - 环境变量示例

## 🎓 扩展阅读

- [Next.js 缓存机制文档](frontend/docs/cache/)
- [Git 同步指南](GIT_SYNC_GUIDE.md)
- [Next.js Revalidation 官方文档](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating#revalidating-data)

## 💡 最佳实践

1. **使用长时间缓存**：1 小时或更长，减少数据库压力
2. **手动失效缓存**：内容更新时立即失效
3. **监控日志**：确认失效是否成功
4. **容错设计**：失效失败不影响同步流程
5. **定期测试**：确保缓存失效机制正常工作

---

**最后更新**：2025-01-14
**维护者**：Blog Platform Team
