# Git 双向同步完整实现

## 概述

本文档描述了博客系统中 Git 仓库与数据库之间的双向同步机制。

## 同步流程

### 1. GitHub → 服务器（Webhook 触发）

当用户在 GitHub 上推送更改时：

```
GitHub Push → Webhook → /api/v1/ops/git/webhook → sync_incremental()
```

**流程**：

1. GitHub 发送 webhook 到服务器
2. 服务器验证 webhook 签名
3. 触发增量同步 `sync_incremental()`
4. Git pull 拉取最新代码
5. 扫描变更的文件
6. 更新数据库（创建/更新/删除文章）
7. **回写元数据到 frontmatter**（ID、关系等）
8. **自动提交并推送回 GitHub**
9. 刷新前端缓存

### 2. 管理后台 → GitHub（自动提交）

当用户在管理后台编辑文章时：

```
Admin Edit → save_post() → run_background_commit() → auto_commit()
```

**流程**：

1. 用户在管理后台创建/更新/删除文章
2. 数据库更新
3. 后台任务触发：
   - 导出文章到 MDX 文件
   - Git add + commit + pull + push
4. 更改推送到 GitHub

## 关键实现

### 元数据回写机制

在同步过程中，系统会将数据库中的元数据写回到 MDX 文件的 frontmatter：

```python
# backend/app/git_ops/components/writer/file_operator.py
async def write_post_ids_to_frontmatter(content_dir, file_path, post, ...):
    """将文章的完整元数据写回到 frontmatter"""
    # 读取文件
    post_fm = frontmatter.load(file)

    # 生成完整元数据（包括 ID、关系等）
    complete_metadata = Frontmatter.to_dict(post, tags=tags)

    # 完全替换 frontmatter
    post_fm.metadata = complete_metadata

    # 写回文件
    frontmatter.dump(post_fm, file)
```

### 自动提交推送

同步完成后，如果有元数据回写，自动提交到 GitHub：

```python
# backend/app/git_ops/services/sync_service.py
async def _commit_metadata_changes(self, stats: SyncStats):
    """提交元数据变更到 GitHub"""
    if not stats.added and not stats.updated:
        return

    # 创建提交服务
    commit_service = CommitService(...)

    # 构建提交信息
    message = f"chore: sync metadata from database (+{added} ~{updated})"

    # 执行 add + commit + pull + push
    await commit_service.auto_commit(message)
```

调用位置：

- `sync_incremental()` - 增量同步后（第 133 行）
- `_sync_all_impl()` - 全量同步后（第 373 行）

## 防止无限循环

### 问题

同步触发提交 → 提交触发 webhook → webhook 触发同步 → ...

### 解决方案

1. **提交信息识别**：元数据提交使用特定前缀 `chore: sync metadata`
2. **Hash 检查**：增量同步会检查 commit hash，如果没有新提交则跳过
3. **同步锁**：使用 `asyncio.Lock` 防止并发同步

```python
async def sync_incremental(self, default_user: User = None) -> SyncStats:
    async with self.sync_lock:  # 防止并发
        current_hash = await self.git_client.get_current_hash()

        # 如果没有新提交，直接返回
        if current_hash == last_hash:
            logger.info("No new commits detected.")
            return SyncStats()
```

## 配置要求

### 1. Webhook 配置

在 GitHub 仓库设置中配置：

- URL: `https://your-domain.com/api/v1/ops/git/webhook`
- Secret: 与 `.env` 中的 `WEBHOOK_SECRET` 一致
- Events: 选择 "Just the push event"

### 2. SSH 密钥配置

服务器需要配置 SSH 密钥以推送到 GitHub：

```bash
# 生成密钥（如果没有）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 添加到 GitHub
cat ~/.ssh/id_ed25519.pub
# 复制内容到 GitHub Settings → SSH Keys

# 测试连接
ssh -T git@github.com
```

### 3. Git 配置

```bash
# 在 content 目录配置 Git
cd content
git config user.name "Your Name"
git config user.email "your_email@example.com"
```

## 测试流程

### 测试 GitHub → 服务器

1. 在 GitHub 上编辑一个 MDX 文件
2. 提交并推送
3. 检查服务器日志：
   ```
   Webhook received: push event
   Starting incremental sync...
   Sync completed: +0 ~1 -0
   Committing metadata changes: chore: sync metadata from database (~1)
   ```
4. 检查 GitHub：应该看到一个新的提交（元数据回写）

### 测试管理后台 → GitHub

1. 在管理后台创建或编辑文章
2. 保存
3. 检查服务器日志：
   ```
   Exporting post to MDX...
   Starting auto-commit: feat: create post "标题"
   Auto-commit finished successfully.
   ```
4. 检查 GitHub：应该看到新的提交

## 故障排查

### 问题：Webhook 触发但同步失败

检查：

1. Webhook secret 是否正确
2. 服务器是否有权限访问 Git 仓库
3. 查看日志：`docker logs backend`

### 问题：推送失败

检查：

1. SSH 密钥是否配置正确
2. Git 用户名和邮箱是否配置
3. 是否有推送权限

### 问题：无限循环

检查：

1. 是否有其他自动化工具也在监听 webhook
2. 查看提交历史，确认是否有重复的元数据提交

## 相关文件

- `backend/app/git_ops/services/sync_service.py` - 同步服务
- `backend/app/git_ops/services/commit_service.py` - 提交服务
- `backend/app/git_ops/components/writer/file_operator.py` - 文件操作和元数据回写
- `backend/app/git_ops/router.py` - Webhook 路由
- `backend/app/posts/routers/posts/editor.py` - 管理后台编辑器
- `backend/app/git_ops/background_tasks.py` - 后台提交任务

## 总结

双向同步机制确保了：

1. ✅ GitHub 上的更改自动同步到服务器
2. ✅ 管理后台的更改自动推送到 GitHub
3. ✅ 元数据（ID、关系）在两端保持一致
4. ✅ 防止无限循环
5. ✅ 并发安全
