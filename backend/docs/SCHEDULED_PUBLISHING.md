# 定时发布功能文档

## 功能概述

定时发布允许你设置文章在未来某个时间点自动发布，无需手动操作或定时任务。

## 工作原理

### 核心机制

**查询时过滤**：文章状态为 `published`，但 `published_at` 是未来时间时，公开接口不会返回该文章。

```python
# 查询逻辑（简化版）
if not include_scheduled:
    query = query.where(
        (Post.status != PostStatus.PUBLISHED)  # 草稿不受限制
        | (Post.published_at <= datetime.now())  # 发布时间已到
    )
```

### 优势

- ✅ **无需定时任务**：不需要 Celery、APScheduler 等
- ✅ **实时生效**：精确到秒，不会有延迟
- ✅ **零性能开销**：只是一个 WHERE 条件
- ✅ **简单可靠**：代码简单，不会出错

## 使用方法

### 1. 创建定时发布文章

**API 请求**：

```bash
POST /api/v1/posts/articles
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "我的定时发布文章",
  "content_mdx": "# 内容\n\n这是一篇定时发布的文章",
  "status": "published",
  "published_at": "2026-02-01T10:00:00Z",  # 🆕 设置未来时间
  "category_id": "..."
}
```

**结果**：

- 文章立即保存到数据库
- 状态为 `published`
- 但在 2026-02-01 10:00:00 之前，公开接口不会返回这篇文章
- 管理后台可以看到这篇文章（标记为"定时发布"）

### 2. 修改定时发布时间

**API 请求**：

```bash
PATCH /api/v1/posts/articles/{post_id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "published_at": "2026-02-01T14:00:00Z"  # 修改发布时间
}
```

### 3. 立即发布定时文章

**方法 1：设置为当前时间**

```bash
PATCH /api/v1/posts/articles/{post_id}
{
  "published_at": "2026-01-31T12:00:00Z"  # 设置为过去时间
}
```

**方法 2：清空发布时间**

```bash
PATCH /api/v1/posts/articles/{post_id}
{
  "published_at": null  # 清空后会自动使用当前时间
}
```

### 4. 取消定时发布

**改为草稿**：

```bash
PATCH /api/v1/posts/articles/{post_id}
{
  "status": "draft"
}
```

## 接口行为

### 公开接口（`include_scheduled=False`）

**影响的接口**：

- `GET /api/v1/posts/{post_type}` - 文章列表
- `GET /api/v1/posts/{post_type}/{post_id}` - 文章详情
- `GET /api/v1/posts/{post_type}/slug/{slug}` - 通过 slug 获取

**行为**：

- ✅ 只返回 `published_at <= 当前时间` 的文章
- ❌ 不返回定时发布的文章（即使状态是 `published`）
- ✅ 草稿文章根据权限决定是否返回

### 管理后台接口（`include_scheduled=True`）

**影响的接口**：

- `GET /api/v1/posts/{post_type}/admin/posts` - 管理后台文章列表
- `GET /api/v1/posts/admin/posts` - 所有文章列表
- `GET /api/v1/posts/me` - 我的文章列表

**行为**：

- ✅ 返回所有文章，包括定时发布的
- ✅ 前端可以根据 `published_at` 显示"定时发布"标签

## 前端集成

### 显示定时发布状态

```typescript
function PostCard({ post }: { post: Post }) {
  const isScheduled =
    post.status === "published" &&
    post.publishedAt &&
    new Date(post.publishedAt) > new Date();

  return (
    <div>
      <h2>{post.title}</h2>
      {isScheduled && (
        <Badge variant="warning">
          定时发布：{formatDate(post.publishedAt)}
        </Badge>
      )}
    </div>
  );
}
```

### 创建定时发布文章

```typescript
const createScheduledPost = async () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 7 天后发布

  await createPost({
    title: "我的文章",
    content_mdx: "...",
    status: "published",
    published_at: futureDate.toISOString(),
  });
};
```

## 数据库查询示例

### 查询所有定时发布的文章

```sql
SELECT id, title, published_at
FROM posts_post
WHERE status = 'published'
  AND published_at > NOW()
ORDER BY published_at ASC;
```

### 查询即将发布的文章（未来 24 小时）

```sql
SELECT id, title, published_at
FROM posts_post
WHERE status = 'published'
  AND published_at > NOW()
  AND published_at <= NOW() + INTERVAL '24 hours'
ORDER BY published_at ASC;
```

## 常见问题

### Q: 定时发布的文章会自动推送到 Git 吗？

A: 不会。Git 是内容来源，定时发布只影响数据库查询和前端显示；网站不会推送 Git。需要发布时，请在 MDX 中设置 `date`/`status` 后提交并触发同步。

### Q: 可以设置多久之后的发布时间？

A: 没有限制，可以设置任意未来时间。但建议不要超过 1 年。

### Q: 定时发布的文章可以被搜索引擎索引吗？

A: 不会。因为公开接口不返回定时发布的文章，搜索引擎爬虫也看不到。

### Q: 如果服务器时间不准确怎么办？

A: 使用 NTP 同步服务器时间，或者在 Docker 中挂载宿主机时区：

```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - /etc/localtime:/etc/localtime:ro
```

### Q: 可以批量设置定时发布吗？

A: 目前 API 不支持批量操作，但可以通过脚本循环调用 PATCH 接口。

## 性能考虑

### 数据库索引

确保 `published_at` 字段有索引：

```sql
CREATE INDEX idx_posts_published_at ON posts_post(published_at);
```

### 查询性能

定时发布过滤只增加一个 WHERE 条件，性能影响可忽略：

```sql
-- 查询计划示例
EXPLAIN ANALYZE
SELECT * FROM posts_post
WHERE status = 'published'
  AND (published_at IS NULL OR published_at <= NOW());

-- 结果：Index Scan using idx_posts_published_at (cost=0.29..8.31 rows=1 width=...)
```

## 未来扩展

### 可选功能（暂未实现）

1. **定时发布通知**：发布前 1 小时发送邮件提醒
2. **自动导入**：Webhook 或定时任务从 Git 导入，不会反向推送
3. **定时取消发布**：设置文章在某个时间后自动下线
4. **定时修改状态**：例如限时活动文章

如需这些功能，可以添加 APScheduler 定时任务。

## 总结

定时发布功能通过**查询时过滤**实现，无需定时任务，简单可靠。适合大多数博客场景。

如果需要更复杂的调度功能（如定时邮件通知、自动 Git 同步），可以参考 `backend/app/core/scheduler.py` 添加定时任务。

---

## Git 集成

### 在 MDX 文件中设置定时发布

你可以直接在 MDX 文件的 frontmatter 中设置定时发布时间：

```yaml
---
title: 我的定时发布文章
date: "2026-02-15 10:00:00" # 🆕 设置未来时间
status: published
category: tech
tags:
  - Python
  - FastAPI
summary: 这篇文章将在 2026年2月15日 10:00 自动发布
---
# 文章内容

这是正文...
```

### 字段说明

| 字段       | 说明                              | 示例                    |
| ---------- | --------------------------------- | ----------------------- |
| `date`     | 发布时间（映射到 `published_at`） | `'2026-02-15 10:00:00'` |
| `status`   | 必须设置为 `published`            | `published`             |
| `title`    | 文章标题                          | `我的文章`              |
| `category` | 分类 slug                         | `tech`                  |
| `tags`     | 标签列表                          | `[Python, FastAPI]`     |

### 时间格式

支持以下格式：

```yaml
# 格式 1：完整时间（推荐）
date: '2026-02-15 10:00:00'

# 格式 2：ISO 8601
date: '2026-02-15T10:00:00Z'

# 格式 3：只有日期（默认 00:00:00）
date: '2026-02-15'
```

### Git 同步流程

1. **创建 MDX 文件**：

   ```bash
   cd content/articles/tech
   vim my-scheduled-post.md
   # 设置 date 为未来时间
   ```

2. **提交到 Git**：

   ```bash
   git add my-scheduled-post.md
   git commit -m "Add scheduled post"
   git push
   ```

3. **同步到数据库**：

   - 方式 1：在管理后台点击"同步"按钮
   - 方式 2：调用 API `POST /api/v1/ops/git/sync`
   - 方式 3：使用 Webhook 自动同步

4. **验证**：
   - 管理后台可以看到文章（标记为"定时发布"）
   - 公开接口看不到文章（直到发布时间到达）

### 示例文件

参考 `content/articles/test/scheduled-post-example.md`：

```yaml
---
title: 定时发布示例文章
date: "2026-02-15 10:00:00"
status: published
category: test
tags:
  - 定时发布
  - 测试
---
# 内容...
```

### 修改定时发布时间

**方法 1：修改 MDX 文件**

```bash
# 编辑文件
vim content/articles/tech/my-post.md
# 修改 date 字段

# 提交并同步
git add my-post.md
git commit -m "Update publish time"
git push

# 在管理后台点击"同步"
```

**方法 2：通过 API 修改**

```bash
PATCH /api/v1/posts/articles/{post_id}
{
  "published_at": "2026-02-16T14:00:00Z"
}
```

注意：API 修改后，下次 Git 同步会覆盖为 MDX 文件中的值（Git-First 原则）。

### 批量创建定时发布文章

```bash
# 创建多篇文章
for i in {1..5}; do
  cat > "content/articles/tech/post-$i.md" <<EOF
---
title: 文章 $i
date: '2026-02-$(printf "%02d" $((10 + i))) 10:00:00'
status: published
category: tech
---

# 文章 $i 的内容
EOF
done

# 提交
git add content/articles/tech/post-*.md
git commit -m "Add 5 scheduled posts"
git push

# 同步到数据库
curl -X POST http://localhost:8000/api/v1/ops/git/sync \
  -H "Authorization: Bearer $TOKEN"
```

### 时区处理

服务器使用的时区（默认 UTC 或 Asia/Shanghai）：

```python
# 查看服务器时区
from datetime import datetime
print(datetime.now())  # 2026-01-31 12:00:00

# 如果需要指定时区
date: '2026-02-15 10:00:00+08:00'  # 北京时间
date: '2026-02-15 02:00:00+00:00'  # UTC 时间（等同于上面）
```

### 常见问题

**Q: Git 同步会覆盖 API 修改的 published_at 吗？**

A: 是的。Git 是唯一内容来源，API 修改只写数据库，后续同步可能被 MDX 文件覆盖。要长期生效，请直接修改 MDX 文件中的 `date` 或 `status`，再执行同步。

**Q: 可以在 frontmatter 中使用相对时间吗？**

A: 不支持。必须使用绝对时间。如果需要相对时间（如"7 天后发布"），需要在创建时计算：

```python
from datetime import datetime, timedelta

future_date = datetime.now() + timedelta(days=7)
print(future_date.strftime('%Y-%m-%d %H:%M:%S'))
# 2026-02-07 12:00:00
```

**Q: 定时发布的文章会自动推送到 Git 吗？**

A: 不会。定时发布只影响前端显示，不会触发 Git 写操作。需要长期生效请修改 MDX 的 `date`/`status` 并提交；定时任务只负责 Git → 数据库导入。
