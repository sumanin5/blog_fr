# 显式 slug 与中文目录（v1）

本轮改动仅做本地提交，不推送或部署；上一轮本地提交保留。内容变更保存在应用内 content 克隆的独立分支中，原外部内容仓库 main 保持原状。

内容提交：`61c2852`，分支 `feat/explicit-slugs-chinese-directories`。该分支也已通过本地 fetch 复制到原 `D:/project/python/blog/blog-content` 仓库；没有联系 GitHub，没有切换原仓库 main，也没有移动原工作区的未跟踪文件。当前可直接照做的发布说明位于应用内 `content/README.md`。

## 唯一内容流

GitHub push → webhook 通知 → 服务器 Git 工作区 → 内容校验 → 数据库 → 页面。
没有第二条 GitHub API 直写数据库的实现，也没有网站回写 Git。
日常增量导入处理新增、修改和删除；首次部署、手动修复和失败重试使用全量对账。
README / AGENTS / CLAUDE 等说明文件仍可能触发 push webhook，但不会作为文章处理。
已初始化且无待重试失败的正常增量中，仅说明文件变化时只推进 Git 游标，不查询作者、不写文章、不刷新内容缓存。
接收端忽略非 push 事件、非指定内容分支和分支删除通知。

## 中文目录与稳定 URL

- 实际应用内容路径：`D:/project/python/blog_fr/content`，由 `backend/.env.local` 指向。
- 9 个分类使用中文目录，每个 `index.md` 显式声明原 slug；27 篇文章显式 slug 保留。
- 分类 slug 在同一板块内唯一，文章 slug 全仓库唯一，完整 URL 不可重复或占用保留路由。
- 目录改名不决定 URL。文章从同目录 index.md 读取分类 slug，不再各自转拼音。
- `.content-contract.json` 的 `version: 1` 启用网站严格检查；旧仓库无声明时暂保留兼容，支持先部署后端再迁移内容。
- 新规则不修改数据库表结构；目录迁移通过原文章 slug 复用现有数据库行。

## 校验的三个入口

1. 本地 Git pre-commit：已为当前 content clone 安装，检查整个暂存区。
2. 内容仓库 `.github/workflows/validate-content.yml`：已准备，只有推送后才会在 GitHub 生效。
3. 网站导入前：严格仓库的全量、增量内容导入、单篇重导和预览均使用同一校验器。

本地钩子可以绕过；发布前需在 GitHub 为 main 配置必需状态检查 `Content contract`，通过 PR 合并，不能把仅有工作流文件视为已经开启远端强制保护。
当前没有更改远端规则，没有 push。

校验器唯一维护源：`backend/app/git_ops/content_contract.py`。
`scripts/install_content_checks.py` 将同一文件复制到内容仓库 tools，并安装钩子/CI 模板；已核对两份字节相同。
不引入 Node/Husky；运行环境只有 Python + PyYAML。
手动检查：在内容仓库执行 `python tools/content_contract.py`；暂存区检查追加 `--staged`。
首次克隆后：安装 tools/requirements.txt，再执行 `python tools/install-hooks.py`。

## 验证

- 完整后端单元及 GitOps/分类 API：399 passed。
- 增加首次分类链接解析顺序回归后，再跑完整单元：317 passed；合计 400 个不同测试分批通过。
- 实际执行临时仓库 git commit：重复 slug 阻止提交，未暂存的修复不会绕过校验，重新暂存修复后可提交。
- 当前内容副本工作区、完整暂存区：均为 36 个内容文件且无冲突，暂存区校验本身约 0.1 秒。
- 独立 `5433/blog_slug_contract_test` 中先导入旧拼音目录，再导入新中文目录：27 篇文章、9 个分类，文章及分类 ID、URL 保持不变。
- 首次迁移导入后，分类相对文章链接已解析，文章归属与显式分类 slug 一致。
- 重复导入稳定、增量为空、源文件未回写；测试库表已清理。
- 真实内容验证 mock 了 Git pull 和前端缓存刷新，没有验证远程网络认证、GitHub Actions 实际运行或浏览器 E2E。

## 内容副本与补丁

- `changes-from-merged-2b7cf2b.patch`：在上一轮整理提交上应用本次显式 slug、中文目录和校验工具。
- `complete-from-original-068d0b6.patch`：从原内容基线应用两轮完整整理。两个补丁是替代入口，不应重复叠加。
- 两个补丁均已做反向只读匹配检查。
- 原内容仓库 main 未改动。旧整理 worktree 的 FastAPI 目录在 Windows 下拒绝重命名，尝试已自动回滚；不以该旧 worktree 作为本轮最终产物。
- 后续提交和发布应以项目 content 副本或本目录新补丁为准，旧版 ASCII 目录补丁仅作历史记录。
- 测试游标会清除并标记需要全量对账，避免开发库误用测试库同步状态。
- 用户原有的两个 frontend/Dockerfile 修改未触碰。

## 单篇文章封面与上传说明

应用内 content/README.md 提供首次安装钩子、新建中文文件、填写显式 slug、暂存检查、提交、草稿与发布的完整步骤。分类封面与文章封面独立，无封面不自动继承。
单篇文章封面可从 frontmatter 的相对路径导入媒体库；列表使用 medium，详情使用 xlarge，SVG 使用原图。详情页新增现有 shadcn Card + Next Image 展示，分享元数据也使用该文章封面。前端部署须设置 NEXT_PUBLIC_SITE_URL 为网站公开 HTTPS 地址，分享平台仍可能缓存旧预览。
旧有效 cover_media_id 优先于路径，替换封面时需去掉本篇旧封面 ID。仅修改图片字节不会自动重导所有引用文件。

Refactoring UI 源码检查：新增封面沿用标题/元信息层级、mb-8 间距、max-w-6xl 容器、语义主题与 Card 默认边框/阴影；无新增文字叠图、交互控件或动画。响应式图片尺寸与无封面分支已有渲染测试。未使用浏览器完成灰度模糊测试、实际对比度或窄屏视觉验收，不能把源码检查视作视觉通过。

本轮复验：后端内容契约与封面测试 21 passed；前端独立封面渲染测试 4 passed，TypeScript 和修改文件 ESLint 通过。首次测试配置合并意外启动了既有集成测试，5 项通过；随后改为替换而非合并数组配置，确认独立单测只运行 4 项且不启动 Python。该次集成测试生成的 backend/test_server.db 已恢复，未提交测试数据。
