# Git → 数据库单向同步

本文档是当前 GitOps 同步的权威说明。旧的双向同步文档仅作历史参考，已标记为过时。

## 显式 slug 内容约定（v1）

内容仓库 `.content-contract.json` 声明 `{"version": 1}` 后启用严格校验。
分类目录可以使用中文，分类 URL 只由同目录 `index.md` 中显式的 `slug` 决定。
文章必须显式声明自己的 slug，移动文件时保留它；不再依赖文件名或目录转拼音来决定地址。
同一板块的分类 slug 唯一；文章 slug 按当前数据库约束在整个内容仓库唯一；完整 URL 不得与其他内容或保留路由冲突。
新约定不改变数据库表结构。部署时先更新后端，再发布带显式 slug 的内容；没有版本声明的旧仓库暂时兼容原解析规则，便于分步上线。

`backend/app/git_ops/content_contract.py` 是校验器唯一维护源。
执行 `python scripts/install_content_checks.py <内容仓库路径>`，将同一文件分发到内容仓库 `tools/content_contract.py`，并提供钩子和 CI 模板。
内容仓库使用 `python tools/install-hooks.py` 为当前 clone 安装原生 pre-commit，不需要 Node 或 Husky。
提交钩子读取完整 Git 暂存区；CI 读取提交快照；网站在严格模式的全量、增量内容导入和单篇重导前校验，失败时不开始写数据库。
本地钩子可以绕过，远端还需将 `Content contract` 设为 main 的必需合并检查；工作流文件未推送前不会在 GitHub 生效。

README / AGENTS / CLAUDE 等说明文件的提交通常仍触发 GitHub push webhook。
接收端验证签名，只处理指定分支的 push；随后以 Git diff 判断实际内容。
只有说明文件变化时推进游标，不查询作者、不写文章、不刷新页面缓存。

## 为什么保留服务器内容目录

数据仍只走一条链路：GitHub → 服务器 Git 工作区 → 校验 → 导入数据库 → 页面。
工作区同时保存 Markdown、图片和可复核的 Git 历史，不增加 GitHub API 逐文件读取、分页和失败重试的第二条导入实现。
日常同步仍采用增量更新；首次部署、手动修复或失败后的对账采用全量导入。
两种方式都执行同一份内容校验和同一组文章/分类处理器；不恢复任何反向回写。

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
- 单篇重新导入也保存仓库相对路径；可修复旧版本保存在当前仓库内的绝对路径。
- 数据库 `source_path` 指向内容仓库之外时，全量同步报告 `SOURCE_PATH_OUTSIDE` 并跳过孤儿删除，避免仓库搬迁或配置错误导致记录被误删。
- 显式 slug 相同的文件只有在旧源文件已不存在时才作为移动处理；旧文件仍存在或 slug 属于数据库独立文章时报告冲突，不覆盖原记录。
- 图片预览只查询已导入的媒体并生成展示 URL，不重复上传；因此已成功导入的相对图片不会单独造成“待更新”。

## 多进程同步

- 全量、增量和单篇重新导入共用 `.git/.gitops_sync.lock` 操作系统文件锁，多个 worker 对同一内容工作区的导入依次执行。
- 锁覆盖拉取、扫描、数据库导入和游标更新；等待锁后重新检查失败标记。
- 进程退出或异常取消后由操作系统释放锁。不要删除锁文件，否则可能让等待中的进程持有不同锁。
- Windows 使用文件字节锁，Linux 使用 `flock`。锁文件属于运行状态，不会提交到内容仓库。
- 该锁适用于共享同一内容工作区且文件系统支持锁的 worker；不同机器各自独立检出、却共用数据库的部署仍需独立同步进程或数据库级协调。

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
