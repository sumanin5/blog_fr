# Git → 数据库单向同步

本文档是当前 GitOps 同步的权威说明。旧的双向同步文档仅作历史参考，已标记为过时。

## 目标

- Git 仓库是文章、Frontmatter、分类 `index.md` 和媒体引用的唯一内容来源。
- 网站只读取 Git 并更新数据库，不修改源文件，不执行 `git add`、`commit` 或 `push`。
- 数据库是可重建的读模型；浏览量、用户、分析等运营数据只存在数据库。
- 后台文章和分类 CRUD 仍然可用，但只修改数据库。

## 数据流

```text
GitHub 仓库
    │ push / webhook
    ▼
FastAPI: git pull --ff-only → diff / scan → 解析 → 更新数据库 → 刷新缓存
    │
    ▼
PostgreSQL
```

没有从数据库回到 Git 的箭头。

## 触发方式

| 入口 | 行为 |
| --- | --- |
| GitHub webhook | 验证签名后触发后台增量导入；`[skip ci]` 不再阻止导入 |
| `POST /ops/git/sync` | 默认增量导入；`force_full=true` 执行全量 |
| `POST /ops/git/posts/{id}/resync-metadata` | 重新读取单篇 Git 文件并更新数据库 |
| `GET /ops/git/preview` | 只读预览，不写数据库、不写文件 |
| `POST /ops/git/push` | 已停用，固定返回 `409 GITOPS_READ_ONLY` |

## 首次全量同步

1. 确认 `CONTENT_DIR` 指向内容仓库，且仓库已 `git pull` 到目标提交。
2. 调用 `POST /api/v1/ops/git/sync?force_full=true`，或等待定时任务。
3. 全量扫描读取 `content` 工作区；部署前请确保没有未提交的 Markdown，避免未提交文件被导入。
   扫描会：
   - 解析所有 `.md` / `.mdx`；
   - 创建或更新文章、分类、标签和媒体引用；
   - 删除数据库中源文件已不存在的文章（前提是本轮没有扫描失败）；
   - 不创建缺失的 `index.md`，不写回任何 ID 或 Frontmatter。
4. 成功后写入同步游标；有错误时保留旧游标，修复后可重试。

## 增量同步与游标

- 游标优先保存在内容仓库的 `.git/.gitops_last_sync`，不污染仓库根目录。
- 兼容旧版根目录 `.gitops_last_sync` 的读取；新写入不会再落到根目录。
- 增量比较使用 `上次成功游标..HEAD`，只处理已提交的变化。
- 只有本轮没有错误时才推进游标。
- 扫描失败的文件会进入 `stats.errors`，并且全量同步会跳过孤儿删除，避免把解析失败误判为文件已删除。
- 全量同步会用 `git ls-files` 校验扫描结果；扫描为空但数据库仍有 Git 来源文章、或缺少 Git 跟踪的 Markdown 时，会跳过孤儿删除且不推进游标。
- 如果上一轮失败，下一次增量同步会先执行一次全量对账，避免只做 `旧游标..HEAD` 树 diff 时漏掉区间内新增后又删除/改名的文件。
- 图片等非 Markdown 变更也会推进游标，避免 webhook 反复处理同一段 diff；但这类变更不会自动重新处理引用它的文章，必要时请手动全量同步或单篇重导。

## 后台编辑边界

- 后台创建文章：只写数据库，`source_path` 为空，不会导出到 Git。
- 后台修改 Git 来源文章：只写数据库；下次同步可能被 Git 源文件覆盖。
- 后台删除 Git 来源文章：只删除数据库记录，不删除 Git 文件；全量同步可能重新导入。
- 后台分类创建、改名、排序、删除：只写数据库，不创建/移动/删除 Git 目录或 `index.md`。
- 后台页面会提示上述边界。需要长期生效的修改请直接在内容仓库中完成。

## 源文件与数据库的差异

- 图片导入和内部链接转换仍然保留，但转换结果只写入数据库的 `content_mdx`。
- Git 中的相对图片路径、相对文章链接保持原样。
- 分类 `index.md` 只读；数据库不会回写 `category_id`、`cover_media_id` 或 `icon_id`。
- Windows 下扫描得到的 `source_path` 统一为 POSIX 格式，与 `git diff` 输出一致。

## 旧回写入口

以下入口保留兼容签名，但都会抛出 `GitOpsReadOnlyError`：

- `GitClient.add/commit/push`
- `GitHubComponent.commit_and_push/auto_commit_metadata`
- `CommitService.auto_commit`
- `ExportService.export_to_git`
- `GitOpsService.auto_commit/export_to_git`
- `FileWriter.write_post/delete_post/write_category`
- `update_frontmatter_metadata/write_post_ids_to_frontmatter`

`POST /ops/git/push` 返回 409，错误码 `GITOPS_READ_ONLY`。

## 部署注意事项

- 上线前先备份数据库和内容仓库工作区。
- 检查服务器内容仓库是否有历史回写产生的未提交文件；先备份、确认来源，再决定提交或清理，不要直接 `git reset --hard`。
- 关闭旧的小时级推送任务和环境变量 `ENABLE_GIT_AUTO_PUSH`（如果仍存在）。
- 撤销 GitHub 远程仓库的 push 权限（Deploy Key 只读或只读 token）；保留本地 `content` 工作区和 `.git` 的读写权限，供 `git pull` 和同步游标写入。
- 确认 webhook 仍指向 `/ops/git/webhook`，并保留 `WEBHOOK_SECRET`。
- 部署后手动执行一次全量同步，再检查 `git status` 和 `git log`，确认没有网站生成的提交。

## 验收清单

- 全量/增量导入后源文件字节不变，工作区无修改，HEAD 不新增提交。
- 后台文章/分类 CRUD 不创建、移动或删除源文件。
- `/ops/git/push` 返回 409。
- 数据库中的图片和内部链接已转换，Git 文件仍是原始相对路径。
- 失败同步不推进游标，下一次重试能再次处理失败内容。
- Windows 下全量扫描和 Git diff 的 `source_path` 一致。
