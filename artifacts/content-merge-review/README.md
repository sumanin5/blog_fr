# 本地单向同步最终修复与内容验收

本目录记录最终补丁和验证结果。网站修复已分批本地提交，内容整理提交为 `2b7cf2b`；尚未推送或部署。

## 本地读取关系

- 独立内容副本：`D:/project/python/blog_fr/content`，分支 `main`。
- `backend/.env.local` 仅覆盖 `CONTENT_DIR=../content`；原 `.env` 保持不变。
- Docker 的 `./content:/git_root/content` 现在也有对应的宿主机内容目录；未实际启动 Docker 验证。
- 内容整理已提交到 `chore/merge-duplicate-categories`，本地 `content/main` 指向同一提交 `2b7cf2b`；原内容仓库的 `main` 仍为 `068d0b6`。本地提交尚未发布。
- 已删除独立测试留下的本地游标并设置需要全量导入标记。首次实际同步会执行全量对账；本次没有向开发库或线上库导入内容。
- 原始仓库 `D:/project/python/blog/blog-content` 未修改。

## 本轮修复

- 迁移先检查整个分类组的冲突，dry-run 与 apply 使用相同检查；冲突时不修改源文件。
- 迁移备份 canonical 和重复目录，暂存完整结果后替换；异常时恢复原目录，恢复失败则保留暂存目录供找回。
- webhook 和定时任务不再在锁外重复写失败标记；同步服务在持锁期间处理失败标记。
- 全量、增量、改名预扫描共用说明文件过滤规则。
- 封面和图标按内容哈希或精确媒体引用解析，不再按文件名模糊搜索；只读预览不上传。
- 内容副本中的 README、AGENTS 更新为单向同步规则。

## GEB 封面

本地现有 `ideas/geb-zi-zhi-de-guai-quan/media/cover.png` 作为权威图像。
已移除与此图像存在冲突的旧 `cover_media_id`，让已有库和重建库都按源图片内容识别。
`decisions.json` 保留移除字段和图片哈希；`geb-index-before.md` 保留修改前索引。
未将分类介绍额外发布为文章。

## 验证

- 完整后端单元测试：300 passed。
- GitOps/分类 API：83 项分批通过。旧“仅凭文件名猜封面”的断言已改为验证不误关联同名图片，相关 4 项 API 复跑通过。
- 静态检查：本轮修改范围 `ruff check --select F` 通过。
- 真实内容：全量两次后 27 篇文章、9 个分类，文章 ID 稳定；随后增量为空；源文件哈希未改变；GEB 封面内容哈希一致。
- 数据库仅为本地 `5433/blog_completion_test`，测试后清理该测试库表。
- 真实内容验证中 mock 了 Git pull 和前端缓存刷新；没有验证 GitHub 网络认证、Docker 启动或浏览器 E2E。

## 补丁与剩余边界

- `content-category-merge.patch` 是更新后的二进制补丁，已验证能与当前本地内容副本反向匹配。
- `previous-content-category-merge.patch` 是旧版补丁备份，不应作为最终版本应用。
- 外部 `D:/project/python/blog/blog-content-category-merge.patch` 也已刷新。
- 3 个既有文章分类缺失封面源文件尚未恢复，仍依赖明确的历史媒体 ID；没有用同名图片代替。
- 多机器独立检出共用数据库仍需数据库级协调或独立同步进程，当前文件锁保护同一共享工作区。
- 不要直接运行旧报告中的 `reset --hard` / `clean -fd`，它们可能丢失后来加入的未提交工作。
