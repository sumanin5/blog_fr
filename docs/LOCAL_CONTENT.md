# 本地开发与独立内容目录

数据库与内容来源独立配置。本地使用自己的数据库和媒体目录；内容可以来自自己的文件夹、自己的 Git 仓库，或与生产相同的仓库。本项目不附带生产文章，也不要求绑定特定 GitHub 账号。

## 首次准备

在项目根目录运行（需要 Python；该脚本仅使用标准库）：

```powershell
python scripts/setup_local_content.py
```

默认使用项目内 `content/`。如果不存在，从已随项目克隆的 `content-template/` 创建最小内容目录；已有目录不会被覆盖。`content/` 本身被 Git 忽略，不会随项目 clone 自动带来原网站文章。

绑定项目外的目录：

```powershell
python scripts/setup_local_content.py --content-dir "D:/my-blog-content"
```

路径可用绝对路径，或相对项目根目录的路径。指定目录不存在时会明确提示，并退回项目 `content/`。这只在运行初始化命令时决定，不会在服务启动时静默切换内容来源，以免从错误目录导入或删除文章。

命令只修改忽略文件 `backend/.env.local` 中三项：

```dotenv
CONTENT_DIR="D:/path/to/blog_fr/content"
GIT_PULL_BEFORE_SYNC=false
ENABLE_GIT_AUTO_SYNC=false
```

它不会修改数据库连接、凭据、Git 分支、remote 或任何源内容。重复执行保留其他环境变量。启动后端需在 `backend/` 下运行，才能加载该目录的 `.env` 和 `.env.local`；已启动的进程需要重启。

## 导入与调试

本地 `GIT_PULL_BEFORE_SYNC=false` 时，手动全量或增量入口都会扫描当前本地文件，不执行 `git pull`，不要求目录有 `.git`，也不推进远程提交游标。未提交的新文章与修改都可导入。扫描完整性、slug 校验和空目录删除保护仍然保留。

先初始化独立本地数据库并创建作者，再在后台执行同步；也可以在 `backend/` 下运行 `python scripts/sync_git_content.py`。这个步骤会修改当前配置的数据库，运行前确认是本地地址；初始化目录命令本身不导入数据。空库还没有管理员时先按项目文档创建，不要为此连接生产库。

新增内容保持 `<articles 或 ideas>/<中文分类>/<文章>.md`，分类 `index.md` 和文章均显式填写 slug。文章 author 必须是本地已有用户名，先用 `status: draft`。封面使用实际存在的相对路径，历史远程媒体 ID 不等于本地媒体记录。

已有数据库时，不要随意将 CONTENT_DIR 改成无关目录；全量对账可能删除旧目录对应的文章。切换无关内容源请使用新的本地数据库。空目录无法证明所有删除时会拒绝清理；最后一篇文章下线可改 draft。

## Docker 与生产

Compose 仍将宿主机 `./content` 挂载到 `/git_root/content`，容器中保持 `CONTENT_DIR=/git_root/content`。本机绝对路径不会直接作为容器内路径使用。要用外部内容目录，应明确修改绑定挂载的宿主机来源，或继续使用项目 content/。

生产保留 `GIT_PULL_BEFORE_SYNC=true`、实际内容 Git clone、只读远程凭据与 `GIT_SYNC_BRANCH`。此时仍先拉取，再按提交增量导入。该开关默认 true，已有生产环境行为不变。

开发 Compose 已在 backend 的 environment 中明确设置 `GIT_PULL_BEFORE_SYNC: "false"` 和 `ENABLE_GIT_AUTO_SYNC: "false"`；backend/.env.local 是本机配置，不应假定容器已加载它。
