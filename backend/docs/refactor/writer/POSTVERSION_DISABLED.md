# PostVersion 功能禁用说明

## 决定

**日期**: 2026-01-19
**状态**: 禁用（保留模型以便后续使用）

## 原因

当前项目采用 **Git-First 架构**，Git 已经管理了完整的版本历史。`PostVersion` 会造成以下问题：

1. **数据重复** - 同一份内容在 Git 和数据库中各存一份
2. **维护成本** - 需要同时维护两套版本系统
3. **数据不一致** - 如果用户直接编辑 Git 仓库中的文件，`PostVersion` 不会被更新
4. **查询复杂** - 用户想看版本历史，需要同时查询 Git 和数据库

## 当前架构

```
用户编辑 MDX 文件
    ↓
Git Commit + Push
    ↓
GitOps Webhook 触发
    ↓
扫描文件系统 → 映射到 Post 模型 → 更新数据库
    ↓
Post.source_path 记录文件位置
    ↓
Git 仓库保存完整的版本历史
```

在这个架构下，版本历史应该由 Git 管理，而不是数据库。

## 禁用的代码

### 1. `backend/app/posts/service.py`

- 注释了 `save_post_version()` 函数
- 注释了 `update_post()` 中的调用

### 2. `backend/app/posts/crud.py`

- 注释了 `get_max_post_version()` 函数

## 如何重新启用

如果未来需要以下功能，可以重新启用 `PostVersion`：

### 场景 1：快速数据库级别的版本回滚

```python
# 用户想回到上一个版本
# 方案 A（Git）：需要 git revert，重新部署
# 方案 B（PostVersion）：直接从数据库查询，一条 SQL 就能恢复
```

### 场景 2：审计日志

```python
# 需要记录"谁在什么时候改了什么"
# Git 只记录 commit，不记录操作者信息
# PostVersion 可以关联 user_id 和 timestamp
```

### 场景 3：版本对比 API

```python
# 用户想看两个版本的差异
# 方案 A（Git）：需要 git diff，可能需要 checkout
# 方案 B（PostVersion）：直接在 API 中返回两个版本的内容对比
```

## 重新启用步骤

1. **取消注释 `service.py` 中的函数**

```python
async def save_post_version(
    session: AsyncSession, post: Post, commit_message: Optional[str] = None
):
    """为文章创建一个历史版本快照"""
    max_version = await crud.get_max_post_version(session, post.id)

    version = PostVersion(
        post_id=post.id,
        version_num=max_version + 1,
        title=post.title,
        content_mdx=post.content_mdx,
        git_hash=post.git_hash,
        commit_message=commit_message or f"Auto-snapshot (v{max_version + 1})",
    )
    session.add(version)
    logger.debug(f"已保存文章版本快照: {post.title} v{version.version_num}")
```

2. **取消注释 `update_post()` 中的调用**

```python
# 在更新前保存当前版本作为快照
await save_post_version(
    session, db_post, commit_message=update_data.get("commit_message")
)
```

3. **取消注释 `crud.py` 中的函数**

```python
async def get_max_post_version(session, post_id: UUID) -> int:
    """获取最大版本号"""
    stmt = select(func.max(PostVersion.version_num)).where(
        PostVersion.post_id == post_id
    )
    result = await session.exec(stmt)
    return result.one() or 0
```

4. **在 `service.py` 中重新导入 `PostVersion`**

```python
from app.posts.model import Category, Post, PostStatus, PostType, PostVersion, Tag
```

5. **测试**

```bash
# 运行单元测试
pytest backend/tests/api/posts/test_update_post.py

# 手动测试：更新一篇文章，检查 PostVersion 表是否有新记录
```

## 模型保留

`PostVersion` 模型在 `backend/app/posts/model.py` 中保留，包括：

- 数据库表定义
- 与 `Post` 的关系
- 所有字段定义

这样可以随时重新启用，无需修改数据库迁移。

## 相关文件

- `backend/app/posts/model.py` - PostVersion 模型定义
- `backend/app/posts/service.py` - save_post_version() 函数（已注释）
- `backend/app/posts/crud.py` - get_max_post_version() 函数（已注释）
- `backend/app/git_ops/ARCHITECTURE.md` - Git-First 架构说明

## 参考

- [Git-First 架构设计](./git_ops/ARCHITECTURE.md)
- [PostVersion 模型](../app/posts/model.py)
