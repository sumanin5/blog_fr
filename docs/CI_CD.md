# CI/CD 与生产发布

## 质量门槛

`backend-ci.yml` 和 `frontend-ci.yml` 同时支持独立 Push/PR 检查及 `workflow_call`。生产发布复用这两个工作流，只有全部成功后才允许构建、推送和部署镜像。

- 后端：Python 3.13、冻结 uv 锁文件、PostgreSQL 17、Alembic 迁移、pytest 与覆盖率、部署失败路径测试、Ruff。
- 前端：Node.js 22、pnpm 10、冻结 pnpm 锁文件、TypeScript、ESLint、Vitest 集成测试、生产构建。
- Vitest 负责启动和清理测试后端，并使用临时 SQLite 数据库；CI 不重复启动同一个端口的服务。启动探测必须返回成功响应，并有等待上限。

### 代码检查范围

前端历史 ESLint 抑制基线已移除，`pnpm lint` 使用 `--max-warnings 0`，错误和警告均阻断发布。生成 SDK 仍不参与手写代码 lint。AdminTable 显式退出 React 自动记忆化，并仅对 TanStack Table 的已知可变 API 兼容性提示保留局部说明；这不放宽其他规则。

后端强制执行 Ruff 完整默认规则 `E4/E7/E9/F`。媒体模块的兼容命名空间必须先建立再导入服务和路由，因此仅对这两个有循环导入约束的位置保留 E402 说明。

流量图表增加 `HourlyTraffic` 后端响应模型，OpenAPI 与前端 SDK 同步生成。服务端 SDK 保留原始响应字段，由适配层转换一次；缓存标签通过 SDK 支持的 fetch 参数传递，携带用户凭证的请求不缓存。

## 发布流程

`deploy.yml` 在 main push 或手动触发时执行。部署只允许 main，生产发布串行运行；进行中的发布不会被新提交取消。

1. 通过后端和前端检查。
2. Checkout 本次提交，以完整 commit SHA 标记三个镜像，任一构建或推送失败即停止。
3. 上传该提交的 Compose 和 `scripts/deploy-release.sh` 至服务器 `.deploy/<SHA>/`，不通过 `git pull main` 获取可能变化的代码。
4. 使用服务器已有 `.env` 拉取镜像，启动并检查数据库。
5. 在新后端镜像中执行 `alembic upgrade head`；失败时不替换应用容器。
6. 保存上一版配置及版本，启动应用并等待健康检查。
7. 验证 Next.js `/api/health` → FastAPI `/health/ready` → 数据库连接，全部成功后报告发布完成。

生产 Compose 要求显式 `IMAGE_TAG`，不挂载宿主机应用代码。内容、媒体、数据库等数据继续持久化。发布不会自动清理旧镜像，以保留回滚材料。

## 服务器准备

服务器需要 Docker Compose v2，支持 `up --wait --wait-timeout`；原有项目目录、生产 `.env`、内容仓库及 SSH 凭证须提前配置。部署不会自动创建生产凭证或初始化内容仓库。

GitHub Secrets 延续现有配置：`ACR_USERNAME`、`ACR_PASSWORD`、`ECS_IP`、`ECS_USER`、`ECS_PASSWORD`，以及项目需要的 `NEXT_PUBLIC_API_URL`。`.env` 不上传为工作流产物。

部署脚本使用 Compose 项目名 `blog_fr`，与原生产目录的默认项目名一致。如果已有生产实例使用其他项目名，应先将脚本与实际名称对齐。

## 运维命令

成功执行部署脚本后，服务器保存 `.release.env`。手动操作时必须同时加载基础配置和发布版本：

```bash
docker compose --project-name blog_fr --env-file .env --env-file .release.env up -d --wait --wait-timeout 180
```

仅本地验证 Compose 配置时使用 `config --quiet`，避免把解析后的敏感环境变量打印到日志。

## 失败与回滚边界

- 拉取或迁移失败会终止发布；迁移失败不替换应用容器，但数据库是否已经有部分变更取决于迁移本身。
- 应用启动或健康检查失败会终止发布，不报告成功；此时部分容器可能已更新，需要操作人员处理。
- `.release.env` 记录本次尝试启动的版本；`.previous-release.env` 与 `.previous-compose.yml` 用于恢复此前配置。首次使用该流程可能没有完整上一版记录。
- 不自动执行数据库降级。迁移应采用新旧应用兼容的分阶段变更；破坏性变更需要单独安排备份、维护和恢复方案。
- 健康检查验证服务与数据库连通性，不证明所有业务、数据库结构或公网 DNS/TLS 正常。

确认数据库与旧应用兼容，且上一版配置与镜像仍存在后，可人工恢复：

```bash
cp .previous-compose.yml docker-compose.yml
cp .previous-release.env .release.env
docker compose --project-name blog_fr --env-file .env --env-file .release.env up -d --wait --wait-timeout 180
```

## 本地验证

```bash
python3 -m unittest discover -s scripts/tests -v
bash -n scripts/deploy-release.sh
cd backend
uv run ruff check .
uv run pytest tests/unit/test_health.py
cd ../frontend
pnpm type-check
pnpm lint
pnpm test
pnpm build
```
