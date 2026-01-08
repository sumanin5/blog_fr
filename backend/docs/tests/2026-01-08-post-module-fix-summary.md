# Post 模块测试修复总结报告

**生成时间**: 2026-01-08
**涉及模块**: `backend/app/posts` & `backend/tests/api/posts`

## 1. 概览

本次修复解决了 `posts` 模块下 6 个失败的测试用例，实现了所有测试 100% 通过。问题主要集中在 **Schema 定义缺失**、**ORM 关联更新机制**、**路由参数绑定错误** 以及 **测试代码与接口契约不一致**。

## 2. 问题分析与修复方案

### 2.1 摘要和标签无法更新 (`test_update_post_as_author`, `test_update_post_tags`)

- **根本原因**: `PostUpdate` Pydantic 模型中缺失 `excerpt` 和 `tags` 字段，导致这些数据在 API 请求验证阶段即被过滤，Service 层无法接收到。
- **修复**:
  - 在 `app.posts.schema.PostUpdate` 中新增 `excerpt: Optional[str]` 和 `tags: Optional[List[str]]`。
  - 在 `app.posts.service.update_post` 中加入显式的标签同步逻辑 (`sync_post_tags`)，并将其从通用的 `setattr` 循环中剔除，防止直接将字符串列表赋值给 ORM 关系字段引发 `AttributeError`。

### 2.2 分类更新后返回旧数据 (`test_update_post_category`)

- **根本原因**: SQLModel/SQLAlchemy 的 `identity map` 机制导致即便数据库已更新，Session 中缓存的 `post.category` 对象依然是旧引用的副本。
- **修复**:
  - 在 `update_post` 提交事务后，使用 `await session.refresh(db_post, attribute_names=["category", "tags"])` 强制从数据库重新加载关联对象。
  - 这替代了会导致 500 错误的 `session.expire` 方案。

### 2.3 标签合并接口报 422 错误 (`test_merge_tags_success`)

- **根本原因**: 路由函数定义使用 `Path` 参数 (`source_tag_id`, `target_tag_id`)，但 URL 路径中未定义占位符。测试代码将参数放在 Body 中发送，导致 FastAPI 无法解析参数。
- **修复**:
  - 定义新的 Schema `TagMergeRequest`。
  - 修改 `app.posts.router.merge_tags`，将其改为接收 Request Body，符合测试行为和 RESTful 规范。

### 2.4 测试代码断言错误 (`test_get_tags_list`)

- **根本原因**: API 已升级为分页返回 (`Page[TagResponse]`)，但测试断言仍假设返回纯列表。
- **修复**:
  - 更新测试代码，从 `data["items"]` 中获取列表进行断言。
  - 注入 `post_with_tags` fixture，确保数据库中有机关联数据的测试场景。

## 3. 关键代码变更摘要

### `backend/app/posts/service.py`

```python
# 显式处理 tags，避免 ORM 赋值错误
if "tags" in update_data:
    await sync_post_tags(session, db_post, update_data["tags"])

# 排除 tags 字段进入通用更新循环
for field, value in update_data.items():
    if field not in ["content_mdx", "commit_message", "tags"]:
        setattr(db_post, field, value)

session.add(db_post)
await session.commit()
# 强制刷新关联，解决 Stale Data
await session.refresh(db_post, attribute_names=["category", "tags"])
```

### `backend/app/posts/crud.py`

```python
# 标签合并时的冲突处理
stmt_conflict = (
    delete(PostTagLink)
    .where(PostTagLink.tag_id == source_tag_id)
    .where(PostTagLink.post_id.in_(...))  # 子查询找出已存在目标的文章
)
await session.exec(stmt_conflict)
```

## 4. 结论

当前 `backend/tests/api/posts/` 下所有 67 个测试用例全部通过。系统的健壮性得到了验证，Schema 契约更加完整，异步 ORM 的操作也更加规范。
