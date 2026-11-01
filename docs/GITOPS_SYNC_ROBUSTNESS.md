# GitOps 内容同步稳健性修复记录

本次修复以 `11e8468` 的五个失败回归测试为起点。没有修改前端、数据库表结构或 slug 生成规则。

## 根因与实现

| 问题 | 根因 | 修改位置与行为 |
| --- | --- | --- |
| 重命名与移动丢失 | `R100` 的旧、新路径被合成一个字符串，处理器不支持 R | `backend/app/git_ops/git_client.py:125`：保留 `(R, old_path, new_path)`，C 转为新路径的 A；`components/handlers/file_processor.py:218`：优先匹配新路径和旧路径，再用 slug 查找原文件已不存在的文章，调用 `handle_post_update(is_move=True)`；`components/handlers/post_update.py:30`：持久化字符串路径，继续排除 slug 更新 |
| 单文件数据库错误污染整批 | 捕获异常时没有回滚；内部 service 的 commit 又会提前提交外层事务 | `backend/app/git_ops/components/handlers/file_processor.py:98`：每个文件使用 `session.begin_nested()`，异常先回滚再交给 `collect_errors`；临时统计只在 savepoint 成功结束后合并。全量孤儿删除和内部链接后处理也隔离。`backend/app/posts/services/post.py:201`、`:320`、`:447` 及媒体创建、分类创建在嵌套事务中只 flush；分类和标签的异常向上传递，避免内部 rollback 撤销整批 |
| 失败文件被跳过 | 部分成功就保存 HEAD；下次 pull 前后范围又截掉历史失败提交 | `backend/app/git_ops/services/sync_service.py:123`、`:148`、`:203`、`:220`：有错误不保存进度；增量总是从上次成功 hash 对比当前工作区（包含 HEAD 和未提交文件），兼容现有测试和本地编辑工作流。缺失记录仍要求先全量同步；旧的 webhook hash 参数保留签名，但不再决定范围 |
| 多 worker 同时操作工作目录 | `asyncio.Lock` 只能保护当前进程 | `backend/app/git_ops/services/sync_service.py:27`、`:45`：固定 bigint 锁键，进程内锁外加独立连接上的 Postgres session advisory lock，等待获取。finally 解锁，清理失败则 invalidate 连接，避免把持锁连接归还池中 |
| 混合推送被错误跳过 | 任意一个提交包含标记就提前返回 | `backend/app/git_ops/router.py:146`：仅当非空提交列表全部含 `[skip ci]` / `[ci skip]` 才跳过；列表为空或缺失时使用 `head_commit`。保留既有 reason 文本和先判断 skip、再做 SHA 去重的顺序 |

## 锁范围与幂等性的取舍

全量同步、增量同步、`ExportService.export_to_git`（`services/export_service.py:37`）和单篇元数据重同步（`services/resync_service.py:32`）共用同一把锁。导出会写文章、提交并 pull/push；单篇重同步会回写 frontmatter，所以两者均需进入相同临界区。锁覆盖整个操作，包括读取进度、Git 操作、写盘、业务提交和保存进度。内部 Git 提交组件由调用入口持锁，避免重复加锁造成死锁。

锁独占一个额外数据库连接；统一键也会串行化同一数据库中不同内容仓库的这些操作。这是当前单内容目录部署下的保守选择。锁是协作式的，本次没有给编辑器等其他直接写文件的业务流程统一加锁。

有文件失败时，成功文件仍提交，整批进度保留。重试会重放成功文件，通过 source_path 更新已有文章，移动则通过旧路径或稳定 slug 找回，保持 ID、slug 和浏览量。没有做内容完全不变时跳过更新的优化，因此重放可能产生额外更新和元数据提交。无成功操作而只有错误时，继续保留已有 API 的 400 约定；部分成功返回 200 和 errors。

全量同步改为先处理磁盘文件、再清理孤儿。增量 A+D 先处理新增，识别出的移动在失败时也保护旧路径；成功移动后重新按当前 source_path 查询删除目标，避免删除同一篇文章。

savepoint 只回滚数据库，磁盘写入不具备事务性。本次测试覆盖了 frontmatter 已写回、统计已追加之后发生 SQL 错误的情况；重试重新验证关联 ID 并覆盖 frontmatter。没有扩展成文件系统或媒体文件的事务回滚方案。

## 回归测试

新增/扩展覆盖：R 移动后的 ID、slug、浏览量与后续修改；C 解析；全量和增量中的写盘后 SQL 错误；没有新提交与 pull 带来新提交时的重试；A+D 移动失败后的身份保留；全量、增量、导出的跨连接等待；持锁任务异常/取消后的解锁；空 commits 的 head_commit 回退。

原有测试没有削弱断言：重试的响应从允许 200/400/500 收紧为 200，并验证错误清空、进度和成功文章身份；重命名测试预先保存标量 ID/slug，避免 ORM identity map 让原对象和新查询结果指向同一个对象而降低断言的区分能力。单元测试补齐新数据库查询的 mock 和新增参数的调用断言。另有七份既有文件仅按当前 Ruff 做格式整理。

## slug 双后缀排查（仅报告，未修改）

首次导入无 slug 文件即可复现，不必先重新同步：

1. `backend/app/git_ops/components/handlers/post_create.py:27` 先用文件名生成 `base-xxxxxx`。
2. 同文件 `:33` 调用 `create_post`，没有传 `preserve_slug=True`。
3. `backend/app/posts/services/post.py:260` 使用默认 `preserve_slug=False`，再次调用 `generate_unique_slug`。
4. `services/post.py:72` 的函数不查重、也不识别旧后缀，直接调用 `backend/app/posts/utils/helpers.py:18` 的随机后缀生成器，得到 `base-xxxxxx-yyyyyy`。

已带 slug 的文件如果走新建流程，也会再加一段后缀并回写。原实现全量同步先删孤儿再按新路径新建，移动文件因此会进入这条路径。正常按 source_path 更新时，`handle_post_update` 排除 slug，不会追加后缀。本次移动识别修复减少了误重建，但没有更改创建时的后缀规则。

建议后续单独修复 Git 导入的 slug 保留契约：只生成一次，明确传入 `preserve_slug=True`，另行处理真实的唯一性冲突。不要批量剥离线上后缀，以免改变已发布 URL；若需要调整，先建立旧 URL 到新 URL 的重定向方案。这些是后续建议，本次未实施。

## 验证输出

修复前五项回归测试：`5 failed in 3.11s`。

扩展回归测试与 GitOps 单元测试：`74 passed in 11.97s`。

```text
$ cd backend && uv run pytest tests/api/git_ops -q
........................................................................ [ 68%]
.................................                                        [100%]
105 passed in 54.05s

$ cd backend && uv run pytest -q
........................................................................ [ 10%]
........................................................................ [ 21%]
........................................................................ [ 31%]
........................................................................ [ 42%]
........................................................................ [ 53%]
........................................................................ [ 63%]
........................................................................ [ 74%]
........................................................................ [ 85%]
........................................................................ [ 95%]
.............................                                            [100%]
677 passed in 126.34s (0:02:06)

$ cd backend && uv run ruff check app tests && uv run ruff format --check app/git_ops tests/api/git_ops
All checks passed!
66 files already formatted
```
