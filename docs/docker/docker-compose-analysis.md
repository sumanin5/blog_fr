# Docker Compose 配置详解

本文档详细解析一个生产级别的 Docker Compose 配置文件，并指导如何逐步集成到你的项目中。

---

## 目录

1. [整体架构概览](#整体架构概览)
2. [数据库服务 (db)](#数据库服务-db)
3. [数据库管理工具 (adminer)](#数据库管理工具-adminer)
4. [预启动服务 (prestart)](#预启动服务-prestart)
5. [后端服务 (backend)](#后端服务-backend)
6. [前端服务 (frontend)](#前端服务-frontend)
7. [数据卷和网络](#数据卷和网络)
8. [集成到你的项目](#集成到你的项目)

---

## 整体架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        Traefik (反向代理)                        │
│                   处理 HTTPS、负载均衡、路由                      │
└─────────────────────────────────────────────────────────────────┘
                │                    │                    │
                ▼                    ▼                    ▼
        ┌───────────┐        ┌───────────┐        ┌───────────┐
        │  Frontend │        │  Backend  │        │  Adminer  │
        │ dashboard.│        │   api.    │        │ adminer.  │
        │ domain.com│        │domain.com │        │domain.com │
        └───────────┘        └───────────┘        └───────────┘
                                   │
                                   ▼
                            ┌───────────┐
                            │ PostgreSQL│
                            │    db     │
                            └───────────┘
                                   │
                                   ▼
                            ┌───────────┐
                            │  Volume   │
                            │ 数据持久化 │
                            └───────────┘
```

### 服务启动顺序

```
db (数据库)
    ↓ (健康检查通过后)
prestart (数据库迁移/初始化)
    ↓ (执行完成后)
backend (后端 API)
    ↓
frontend (前端应用)
adminer (数据库管理)
```

---

## 数据库服务 (db)

```yaml
db:
  image: postgres:17
  restart: always
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
    interval: 10s
    retries: 5
    start_period: 30s
    timeout: 10s
  volumes:
    - app-db-data:/var/lib/postgresql/data/pgdata
  env_file:
    - .env
  environment:
    - PGDATA=/var/lib/postgresql/data/pgdata
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD?Variable not set}
    - POSTGRES_USER=${POSTGRES_USER?Variable not set}
    - POSTGRES_DB=${POSTGRES_DB?Variable not set}
```

### 逐行解析

| 配置项 | 值 | 含义 | 好处 |
|--------|-----|------|------|
| `image: postgres:17` | PostgreSQL 17 官方镜像 | 使用最新稳定版 PostgreSQL | 性能好、功能全、社区支持 |
| `restart: always` | 总是重启 | 容器崩溃/主机重启后自动恢复 | 生产环境必备，保证高可用 |

### 健康检查 (healthcheck) 详解

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
  interval: 10s      # 每 10 秒检查一次
  retries: 5         # 失败 5 次才判定为不健康
  start_period: 30s  # 启动后 30 秒内不计入失败次数
  timeout: 10s       # 每次检查超时时间
```

| 参数 | 说明 | 为什么这样设置 |
|------|------|----------------|
| `test` | 执行 `pg_isready` 命令检查数据库是否就绪 | PostgreSQL 官方推荐的检查方式 |
| `interval: 10s` | 检查间隔 | 太短浪费资源，太长发现问题慢 |
| `retries: 5` | 重试次数 | 避免偶发失败导致误判 |
| `start_period: 30s` | 启动宽限期 | 数据库初始化需要时间，给足时间 |
| `timeout: 10s` | 超时时间 | 防止检查命令卡死 |

**健康检查的重要性**：
- 其他服务可以用 `depends_on: condition: service_healthy` 等待数据库真正就绪
- 避免后端在数据库未就绪时启动导致连接失败

### 数据卷 (volumes) 详解

```yaml
volumes:
  - app-db-data:/var/lib/postgresql/data/pgdata
```

| 配置 | 说明 |
|------|------|
| `app-db-data` | Docker 管理的命名卷 |
| `/var/lib/postgresql/data/pgdata` | PostgreSQL 数据存储路径 |

**为什么用命名卷而不是绑定挂载？**

| 方式 | 示例 | 优点 | 缺点 |
|------|------|------|------|
| 命名卷 | `app-db-data:/path` | Docker 管理、可移植、权限自动处理 | 不方便直接访问文件 |
| 绑定挂载 | `./data:/path` | 可直接访问文件 | 权限问题、不同系统路径不一致 |

**生产环境推荐使用命名卷！**

### 环境变量详解

```yaml
env_file:
  - .env  # 从 .env 文件批量读取环境变量

environment:
  - PGDATA=/var/lib/postgresql/data/pgdata
  - POSTGRES_PASSWORD=${POSTGRES_PASSWORD?Variable not set}
  - POSTGRES_USER=${POSTGRES_USER?Variable not set}
  - POSTGRES_DB=${POSTGRES_DB?Variable not set}
```

| 变量 | 作用 | `?Variable not set` 的含义 |
|------|------|---------------------------|
| `PGDATA` | 指定数据目录位置 | - |
| `POSTGRES_PASSWORD` | 数据库密码 | **如果未设置，直接报错停止** |
| `POSTGRES_USER` | 数据库用户名 | **如果未设置，直接报错停止** |
| `POSTGRES_DB` | 默认数据库名 | **如果未设置，直接报错停止** |

**`${VAR?error message}` 语法**：
- 这是 shell 的参数扩展语法
- 如果变量未设置，会打印错误信息并退出
- **作用**：强制要求必须设置这些变量，防止用默认值导致安全问题

---

## 数据库管理工具 (adminer)

```yaml
adminer:
  image: adminer
  restart: always
  networks:
    - traefik-public
    - default
  depends_on:
    - db
  environment:
    - ADMINER_DESIGN=pepa-linha-dark
  labels:
    - traefik.enable=true
    - traefik.docker.network=traefik-public
    - traefik.constraint-label=traefik-public
    - traefik.http.routers.${STACK_NAME}-adminer-http.rule=Host(`adminer.${DOMAIN}`)
    - traefik.http.routers.${STACK_NAME}-adminer-http.entrypoints=http
    - traefik.http.routers.${STACK_NAME}-adminer-http.middlewares=https-redirect
    - traefik.http.routers.${STACK_NAME}-adminer-https.rule=Host(`adminer.${DOMAIN}`)
    - traefik.http.routers.${STACK_NAME}-adminer-https.entrypoints=https
    - traefik.http.routers.${STACK_NAME}-adminer-https.tls=true
    - traefik.http.routers.${STACK_NAME}-adminer-https.tls.certresolver=le
    - traefik.http.services.${STACK_NAME}-adminer.loadbalancer.server.port=8080
```

### 什么是 Adminer？

Adminer 是一个轻量级的数据库管理工具（类似 phpMyAdmin），用于：
- 浏览数据库表结构
- 执行 SQL 查询
- 导入/导出数据

### Traefik Labels 详解

Traefik 是一个现代化的反向代理，通过 Docker labels 自动发现和配置路由。

```yaml
labels:
  # 启用 Traefik 对这个容器的代理
  - traefik.enable=true

  # 指定使用哪个 Docker 网络进行通信
  - traefik.docker.network=traefik-public

  # 路由约束标签，用于多 Traefik 实例场景
  - traefik.constraint-label=traefik-public

  # ============ HTTP 路由 ============
  # 匹配规则：域名是 adminer.yourdomain.com
  - traefik.http.routers.${STACK_NAME}-adminer-http.rule=Host(`adminer.${DOMAIN}`)
  # 入口点：HTTP (80端口)
  - traefik.http.routers.${STACK_NAME}-adminer-http.entrypoints=http
  # 中间件：自动跳转到 HTTPS
  - traefik.http.routers.${STACK_NAME}-adminer-http.middlewares=https-redirect

  # ============ HTTPS 路由 ============
  # 匹配规则：同上
  - traefik.http.routers.${STACK_NAME}-adminer-https.rule=Host(`adminer.${DOMAIN}`)
  # 入口点：HTTPS (443端口)
  - traefik.http.routers.${STACK_NAME}-adminer-https.entrypoints=https
  # 启用 TLS
  - traefik.http.routers.${STACK_NAME}-adminer-https.tls=true
  # 使用 Let's Encrypt 自动获取证书
  - traefik.http.routers.${STACK_NAME}-adminer-https.tls.certresolver=le

  # ============ 服务配置 ============
  # 告诉 Traefik 容器内部监听的端口
  - traefik.http.services.${STACK_NAME}-adminer.loadbalancer.server.port=8080
```

### Traefik 的好处

| 特性 | 说明 |
|------|------|
| 自动服务发现 | 通过 Docker labels 自动配置，无需手动修改配置文件 |
| 自动 HTTPS | 集成 Let's Encrypt，自动申请和续期 SSL 证书 |
| 动态配置 | 容器启动/停止时自动更新路由 |
| 负载均衡 | 多实例时自动负载均衡 |

---

## 预启动服务 (prestart)

```yaml
prestart:
  image: '${DOCKER_IMAGE_BACKEND}:${TAG-latest}'
  build:
    context: ./backend
  networks:
    - traefik-public
    - default
  depends_on:
    db:
      condition: service_healthy
      restart: true
  command: bash scripts/prestart.sh
  env_file:
    - .env
  environment:
    # ... 环境变量
```

### 这个服务的作用

prestart 是一个**一次性任务**，在后端启动前执行：

1. **数据库迁移** (如 Alembic migrate)
2. **创建初始数据** (如超级管理员账户)
3. **检查配置是否正确**

### 关键配置解析

```yaml
depends_on:
  db:
    condition: service_healthy  # 等待数据库健康检查通过
    restart: true               # 如果 db 重启，prestart 也重新执行
```

| 配置 | 作用 |
|------|------|
| `condition: service_healthy` | 不只是等待容器启动，而是等待健康检查通过 |
| `restart: true` | 数据库重启后，重新执行迁移脚本 |

```yaml
command: bash scripts/prestart.sh
```

覆盖 Dockerfile 的 CMD，执行预启动脚本。

### 典型的 prestart.sh 内容

```bash
#!/bin/bash
set -e

# 等待数据库就绪（双重保险）
python -c "from app.db import engine; engine.connect()"

# 执行数据库迁移
alembic upgrade head

# 创建初始数据
python -c "from app.initial_data import init; init()"

echo "Prestart completed successfully!"
```

---

## 后端服务 (backend)

```yaml
backend:
  image: '${DOCKER_IMAGE_BACKEND}:${TAG-latest}'
  restart: always
  networks:
    - traefik-public
    - default
  depends_on:
    db:
      condition: service_healthy
      restart: true
    prestart:
      condition: service_completed_successfully  # 关键！
  env_file:
    - .env
  environment:
    - DOMAIN=${DOMAIN}
    - FRONTEND_HOST=${FRONTEND_HOST?Variable not set}
    - ENVIRONMENT=${ENVIRONMENT}
    - BACKEND_CORS_ORIGINS=${BACKEND_CORS_ORIGINS}
    - SECRET_KEY=${SECRET_KEY?Variable not set}
    - FIRST_SUPERUSER=${FIRST_SUPERUSER?Variable not set}
    - FIRST_SUPERUSER_PASSWORD=${FIRST_SUPERUSER_PASSWORD?Variable not set}
    - SMTP_HOST=${SMTP_HOST}
    - SMTP_USER=${SMTP_USER}
    - SMTP_PASSWORD=${SMTP_PASSWORD}
    - EMAILS_FROM_EMAIL=${EMAILS_FROM_EMAIL}
    - POSTGRES_SERVER=db
    - POSTGRES_PORT=${POSTGRES_PORT}
    - POSTGRES_DB=${POSTGRES_DB}
    - POSTGRES_USER=${POSTGRES_USER?Variable not set}
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD?Variable not set}
    - SENTRY_DSN=${SENTRY_DSN}
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/utils/health-check/"]
    interval: 10s
    timeout: 5s
    retries: 5
  build:
    context: ./backend
  labels:
    # Traefik 配置...
```

### 关键配置详解

#### 依赖关系

```yaml
depends_on:
  db:
    condition: service_healthy        # 数据库健康
    restart: true
  prestart:
    condition: service_completed_successfully  # 预启动脚本执行成功
```

**`service_completed_successfully`**：等待 prestart 容器退出且退出码为 0

这确保了：
1. 数据库已完全就绪
2. 数据库迁移已完成
3. 初始数据已创建

#### 环境变量分析

```yaml
environment:
  # ========== 必填项（未设置会报错） ==========
  - FRONTEND_HOST=${FRONTEND_HOST?Variable not set}
  - SECRET_KEY=${SECRET_KEY?Variable not set}
  - FIRST_SUPERUSER=${FIRST_SUPERUSER?Variable not set}
  - FIRST_SUPERUSER_PASSWORD=${FIRST_SUPERUSER_PASSWORD?Variable not set}
  - POSTGRES_USER=${POSTGRES_USER?Variable not set}
  - POSTGRES_PASSWORD=${POSTGRES_PASSWORD?Variable not set}

  # ========== 可选项（可以为空） ==========
  - DOMAIN=${DOMAIN}
  - ENVIRONMENT=${ENVIRONMENT}
  - BACKEND_CORS_ORIGINS=${BACKEND_CORS_ORIGINS}
  - SMTP_HOST=${SMTP_HOST}
  - SMTP_USER=${SMTP_USER}
  - SMTP_PASSWORD=${SMTP_PASSWORD}
  - EMAILS_FROM_EMAIL=${EMAILS_FROM_EMAIL}
  - SENTRY_DSN=${SENTRY_DSN}

  # ========== 数据库连接 ==========
  - POSTGRES_SERVER=db    # 注意：这里直接写服务名，不用变量！
  - POSTGRES_PORT=${POSTGRES_PORT}
  - POSTGRES_DB=${POSTGRES_DB}
```

**为什么 `POSTGRES_SERVER=db` 是硬编码？**

因为 `db` 是 Docker Compose 中的服务名，Docker 会自动将其解析为对应容器的 IP 地址。这是 Docker 网络的特性，与外部环境变量无关。

#### 后端健康检查

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/utils/health-check/"]
  interval: 10s
  timeout: 5s
  retries: 5
```

与数据库不同，后端使用 HTTP 请求检查：
- 调用一个专门的健康检查 API
- 如果返回 200，说明服务正常

#### Traefik 路由配置

```yaml
labels:
  - traefik.enable=true
  - traefik.docker.network=traefik-public

  # 服务端口
  - traefik.http.services.${STACK_NAME}-backend.loadbalancer.server.port=8000

  # HTTP 路由 -> 跳转到 HTTPS
  - traefik.http.routers.${STACK_NAME}-backend-http.rule=Host(`api.${DOMAIN}`)
  - traefik.http.routers.${STACK_NAME}-backend-http.entrypoints=http
  - traefik.http.routers.${STACK_NAME}-backend-http.middlewares=https-redirect

  # HTTPS 路由
  - traefik.http.routers.${STACK_NAME}-backend-https.rule=Host(`api.${DOMAIN}`)
  - traefik.http.routers.${STACK_NAME}-backend-https.entrypoints=https
  - traefik.http.routers.${STACK_NAME}-backend-https.tls=true
  - traefik.http.routers.${STACK_NAME}-backend-https.tls.certresolver=le
```

最终效果：`https://api.yourdomain.com` → 后端服务

---

## 前端服务 (frontend)

```yaml
frontend:
  image: '${DOCKER_IMAGE_FRONTEND}:${TAG-latest}'
  restart: always
  networks:
    - traefik-public
    - default
  build:
    context: ./frontend
    args:
      - VITE_API_URL=https://api.${DOMAIN}
      - NODE_ENV=production
  labels:
    # Traefik 配置...
```

### 构建参数 (build args)

```yaml
build:
  context: ./frontend
  args:
    - VITE_API_URL=https://api.${DOMAIN}  # 前端调用的 API 地址
    - NODE_ENV=production                  # 生产模式构建
```

**注意**：这些是**构建时**的参数，会被"烘焙"到前端代码中，不是运行时环境变量。

---

## 数据卷和网络

### 数据卷

```yaml
volumes:
  app-db-data:  # 声明一个命名卷
```

这个卷会存储在 Docker 的数据目录中（通常是 `/var/lib/docker/volumes/`）。

### 网络

```yaml
networks:
  traefik-public:
    external: true  # 使用外部已存在的网络
```

| 配置 | 说明 |
|------|------|
| `external: true` | 这个网络不由此 compose 文件创建，必须提前存在 |
| `traefik-public` | Traefik 和各服务共用的网络 |

**为什么需要外部网络？**

因为 Traefik 通常是独立部署的，多个项目共用一个 Traefik 实例。所有项目都连接到同一个 `traefik-public` 网络，Traefik 才能代理所有服务。

---

## 集成到你的项目

### 第一步：创建 .env 文件

在项目根目录创建 `.env` 文件：

```bash
# 数据库配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=blog_fr
POSTGRES_PORT=5432

# 后端配置
SECRET_KEY=your_super_secret_key_here_at_least_32_chars
ENVIRONMENT=development

# 如果是开发环境，可以先不配置这些
# DOMAIN=yourdomain.com
# FRONTEND_HOST=https://dashboard.yourdomain.com
# FIRST_SUPERUSER=admin@example.com
# FIRST_SUPERUSER_PASSWORD=admin123
```

### 第二步：简化版配置（开发环境）

你当前的项目可以先用这个简化版本：

```yaml
services:
  # ==========================================
  # PostgreSQL 数据库
  # ==========================================
  db:
    image: postgres:17
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      retries: 5
      start_period: 30s
      timeout: 10s
    volumes:
      - postgres_data:/var/lib/postgresql/data/pgdata
    environment:
      - PGDATA=/var/lib/postgresql/data/pgdata
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_DB=${POSTGRES_DB}
    ports:
      - "5432:5432"  # 开发时暴露端口方便调试

  # ==========================================
  # 后端 API
  # ==========================================
  backend:
    build: ./backend
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/.venv
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      - ENVIRONMENT=development
    command: fastapi run --workers 4 app/main.py --reload

volumes:
  postgres_data:
```

### 第三步：逐步添加功能

| 阶段 | 添加的功能 |
|------|-----------|
| 1. 基础 | db + backend（当前） |
| 2. 管理工具 | 添加 adminer 服务 |
| 3. 预启动 | 添加 prestart 服务（数据库迁移） |
| 4. 前端 | 添加 frontend 服务 |
| 5. 生产 | 添加 Traefik + HTTPS |

### 第四步：生产环境检查清单

- [ ] 所有密码使用强密码
- [ ] 移除不必要的端口暴露（如 `5432:5432`）
- [ ] 添加 Traefik 或其他反向代理
- [ ] 配置 HTTPS
- [ ] 设置 `restart: always`
- [ ] 添加日志收集（如 Loki）
- [ ] 添加监控（如 Prometheus + Grafana）
- [ ] 配置备份策略

---

## 常用命令

```bash
# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f backend

# 进入容器调试
docker compose exec backend bash

# 查看数据库
docker compose exec db psql -U postgres -d blog_fr

# 停止并删除容器（保留数据）
docker compose down

# 停止并删除容器和数据卷（危险！会删除数据）
docker compose down -v

# 重新构建镜像
docker compose build --no-cache

# 查看服务状态
docker compose ps
```

---

## 总结

这个配置文件展示了一个**生产级别**的 Docker Compose 架构，核心特点：

1. **健康检查**：确保服务按正确顺序启动
2. **环境变量验证**：必填项未设置会报错
3. **数据持久化**：使用命名卷保存数据库数据
4. **服务编排**：prestart → backend 的依赖链
5. **反向代理**：Traefik 自动 HTTPS 和路由
6. **安全性**：敏感信息通过环境变量注入

对于你的博客项目，建议从简单版本开始，随着项目发展逐步添加功能。
