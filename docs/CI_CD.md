# 🚀 CI/CD 配置指南

本项目使用 **GitHub Actions** 实现持续集成和持续部署。

---

## 📋 当前配置状态

### ✅ 已配置（基础 CI）

| Workflow         | 触发条件                    | 功能             | 状态      |
| ---------------- | --------------------------- | ---------------- | --------- |
| **Backend CI**   | Push/PR to `main`/`develop` | 运行后端测试     | ✅ 已配置 |
| **Frontend CI**  | Push/PR to `main`/`develop` | 类型检查、构建   | ✅ 已配置 |
| **Docker Build** | Push to `main`              | 构建 Docker 镜像 | ✅ 已配置 |

### 🔜 待配置（完整 CD）

- ⏳ 自动部署到 Staging 环境
- ⏳ 自动部署到 Production 环境
- ⏳ 数据库迁移自动化
- ⏳ 回滚机制

---

## 🎯 Workflow 详解

### 1. Backend CI (`backend-ci.yml`)

**触发条件：**

- Push 到 `main` 或 `develop` 分支
- Pull Request 到 `main` 或 `develop` 分支
- 修改了 `backend/` 目录下的文件

**执行步骤：**

1. ✅ 启动 PostgreSQL 17 测试数据库
2. ✅ 安装 Python 3.13 + uv
3. ✅ 安装项目依赖
4. ✅ 运行 pytest 测试套件
5. ✅ 代码风格检查（ruff）

**预期结果：**

- 所有测试通过 ✅
- 代码符合规范 ✅

---

### 2. Frontend CI (`frontend-ci.yml`)

**触发条件：**

- Push 到 `main` 或 `develop` 分支
- Pull Request 到 `main` 或 `develop` 分支
- 修改了 `frontend/` 目录下的文件

**执行步骤：**

1. ✅ 安装 Node.js 20 + pnpm
2. ✅ 安装项目依赖（带缓存优化）
3. ✅ TypeScript 类型检查
4. ✅ ESLint 代码检查
5. ✅ 构建生产版本

**预期结果：**

- 类型检查通过 ✅
- 构建成功 ✅

---

### 3. Docker Build (`docker-build.yml`)

**触发条件：**

- Push 到 `main` 分支
- 创建版本标签（如 `v1.0.0`）

**执行步骤：**

1. ✅ 构建后端 Docker 镜像
2. ✅ 构建前端 Docker 镜像
3. ✅ 使用 GitHub Actions 缓存加速构建

**预期结果：**

- 镜像构建成功 ✅
- 构建时间 < 5 分钟 ✅

---

## 🔧 本地测试 CI

### 测试后端 CI

```bash
# 1. 启动测试数据库
docker run -d --name test-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=blog_fr_test \
  -p 5432:5432 \
  postgres:17

# 2. 运行测试
cd backend
export ENVIRONMENT=test
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blog_fr_test
uv run pytest -v

# 3. 清理
docker rm -f test-db
```

### 测试前端 CI

```bash
cd frontend
pnpm install
pnpm run type-check
pnpm run lint
pnpm run build
```

### 测试 Docker 构建

```bash
# 后端
docker build -t blog-fr-backend:test ./backend

# 前端
docker build -t blog-fr-frontend:test ./frontend
```

---

## 📊 查看 CI 状态

### GitHub Actions 页面

访问：`https://github.com/YOUR_USERNAME/blog_fr/actions`

### 添加状态徽章（可选）

在 `README.md` 中添加：

```markdown
![Backend CI](https://github.com/YOUR_USERNAME/blog_fr/workflows/Backend%20CI/badge.svg)
![Frontend CI](https://github.com/YOUR_USERNAME/blog_fr/workflows/Frontend%20CI/badge.svg)
```

---

## 🚀 配置完整 CD（生产部署）

### 方案 1：部署到 VPS（推荐）

**适用场景**：自有服务器、低成本

**步骤：**

1. **添加 GitHub Secrets**

在 GitHub 仓库设置中添加：

- `SSH_HOST`: 服务器 IP
- `SSH_USER`: SSH 用户名
- `SSH_PRIVATE_KEY`: SSH 私钥
- `DOCKER_REGISTRY_TOKEN`: Docker Hub Token（可选）

2. **创建部署 Workflow**

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags:
      - "v*"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/blog_fr
            git pull origin main
            docker compose down
            docker compose up -d --build
            docker compose exec -T backend alembic upgrade head
```

---

### 方案 2：部署到云平台

#### Railway（最简单）

1. 连接 GitHub 仓库
2. 自动检测 Dockerfile
3. 一键部署 ✅

#### Render（免费额度）

1. 创建 Web Service
2. 连接 GitHub
3. 配置环境变量
4. 自动部署 ✅

#### AWS/GCP/Azure（企业级）

需要配置：

- ECS/Cloud Run/App Service
- RDS/Cloud SQL 数据库
- S3/Cloud Storage 媒体存储
- CloudFront/CDN 加速

---

## 🔐 安全最佳实践

### 1. 保护敏感信息

**❌ 不要在代码中硬编码：**

- 数据库密码
- API 密钥
- JWT Secret

**✅ 使用 GitHub Secrets：**

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  SECRET_KEY: ${{ secrets.SECRET_KEY }}
```

### 2. 限制 Workflow 权限

```yaml
permissions:
  contents: read
  pull-requests: write
```

### 3. 使用环境保护规则

在 GitHub 设置中配置：

- 需要审批才能部署到生产环境
- 限制部署分支（只允许 `main`）

---

## 📈 性能优化

### 1. 缓存依赖

**Python (uv):**

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/uv
    key: ${{ runner.os }}-uv-${{ hashFiles('**/uv.lock') }}
```

**Node.js (pnpm):**

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 9
```

### 2. 并行执行

```yaml
jobs:
  backend-test:
    # ...
  frontend-test:
    # ...
  # 两个 job 并行运行
```

### 3. 条件执行

```yaml
on:
  push:
    paths:
      - "backend/**" # 只在后端代码变更时运行
```

---

## 🐛 故障排查

### CI 失败常见原因

1. **测试失败**

   - 检查测试日志
   - 本地复现问题
   - 修复后重新 push

2. **依赖安装失败**

   - 检查 `pyproject.toml` / `package.json`
   - 确认依赖版本兼容性

3. **数据库连接失败**
   - 检查 PostgreSQL service 配置
   - 确认环境变量正确

### 查看详细日志

```bash
# 在 GitHub Actions 页面点击失败的 workflow
# 展开每个步骤查看详细输出
```

---

## 📚 下一步

### 短期（1-2 周）

- [ ] 添加测试覆盖率报告（pytest-cov）
- [ ] 集成代码质量检查（SonarQube/CodeClimate）
- [ ] 添加性能测试（Locust）

### 中期（1-2 月）

- [ ] 配置 Staging 环境自动部署
- [ ] 添加数据库迁移自动化
- [ ] 配置回滚机制

### 长期（3+ 月）

- [ ] 蓝绿部署
- [ ] 金丝雀发布
- [ ] 自动化压力测试

---

## 🎓 学习资源

- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [Docker 最佳实践](https://docs.docker.com/develop/dev-best-practices/)
- [12-Factor App](https://12factor.net/)

---

**CI/CD 配置完成！** 🎉

现在每次 push 代码，GitHub Actions 会自动运行测试，确保代码质量。
