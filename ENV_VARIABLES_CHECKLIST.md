# 📋 环境变量配置清单

本文档列出了所有后端配置项及其对应的环境变量，帮助你检查配置是否完整。

---

## ✅ 配置完整性检查

### 1. 基础应用配置 (`base.py`)

| 环境变量      | 必需 | 默认值                  | 说明                                         | 模板中 |
| ------------- | ---- | ----------------------- | -------------------------------------------- | ------ |
| `ENVIRONMENT` | ✅   | `local`                 | 运行环境 (local/development/production/test) | ✅     |
| `API_VERSION` | ❌   | `v1`                    | API 版本号                                   | ✅     |
| `API_PREFIX`  | ❌   | `/api/v1`               | API 路径前缀                                 | ✅     |
| `BASE_URL`    | ✅   | `http://localhost:8000` | 后端基础 URL                                 | ✅     |

### 2. 数据库配置 (`database.py`)

| 环境变量            | 必需 | 默认值  | 说明                            | 模板中 |
| ------------------- | ---- | ------- | ------------------------------- | ------ |
| `DATABASE_URL`      | ✅   | -       | 完整的数据库连接 URL            | ✅     |
| `DATABASE_ECHO`     | ❌   | `False` | 是否显示 SQL 日志               | ✅     |
| `POSTGRES_USER`     | ❌   | -       | PostgreSQL 用户名 (Docker 用)   | ✅     |
| `POSTGRES_PASSWORD` | ❌   | -       | PostgreSQL 密码 (Docker 用)     | ✅     |
| `POSTGRES_DB`       | ❌   | -       | PostgreSQL 数据库名 (Docker 用) | ✅     |
| `POSTGRES_SERVER`   | ❌   | -       | PostgreSQL 服务器地址           | ✅     |
| `POSTGRES_PORT`     | ❌   | `5432`  | PostgreSQL 端口                 | ✅     |

### 3. 安全与认证配置 (`security.py`)

| 环境变量                      | 必需 | 默认值              | 说明                 | 模板中 |
| ----------------------------- | ---- | ------------------- | -------------------- | ------ |
| `SECRET_KEY`                  | ✅   | `changethis...`     | JWT 签名密钥         | ✅     |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ❌   | `10080` (7 天)      | 访问令牌过期时间     | ✅     |
| `FIRST_SUPERUSER`             | ❌   | `admin`             | 初始超级管理员用户名 | ✅     |
| `FIRST_SUPERUSER_PASSWORD`    | ✅   | `123456`            | 初始超级管理员密码   | ✅     |
| `FIRST_SUPERUSER_EMAIL`       | ❌   | `admin@example.com` | 初始超级管理员邮箱   | ✅     |
| `BACKEND_CORS_ORIGINS`        | ✅   | `[]`                | 允许跨域的源列表     | ✅     |

**⚠️ 重要**: `initial_data.py` 会读取以下三个环境变量来创建初始超级管理员：

- `FIRST_SUPERUSER` - 用户名
- `FIRST_SUPERUSER_PASSWORD` - 密码
- `FIRST_SUPERUSER_EMAIL` - 邮箱

### 4. GitOps 配置 (`git_ops.py`)

| 环境变量                     | 必需 | 默认值              | 说明                  | 模板中 |
| ---------------------------- | ---- | ------------------- | --------------------- | ------ |
| `CONTENT_DIR`                | ✅   | `/git_root/content` | Git 内容仓库根目录    | ✅     |
| `GIT_AUTO_CREATE_CATEGORIES` | ❌   | `True`              | 是否自动创建分类      | ✅     |
| `GIT_STRICT_STRUCTURE`       | ❌   | `False`             | 是否强制目录结构      | ✅     |
| `GIT_DEFAULT_CATEGORY`       | ❌   | `uncategorized`     | 默认分类别名          | ✅     |
| `WEBHOOK_SECRET`             | ❌   | -                   | GitHub Webhook Secret | ✅     |

### 5. 媒体文件配置 (`media.py`)

| 环境变量     | 必需 | 默认值                         | 说明                  | 模板中 |
| ------------ | ---- | ------------------------------ | --------------------- | ------ |
| `MEDIA_ROOT` | ❌   | `media`                        | 媒体文件存储根目录    | ✅     |
| `MEDIA_URL`  | ✅   | `http://localhost:8000/media/` | 媒体文件访问 URL 前缀 | ✅     |

### 6. 外部集成配置 (`external.py`)

| 环境变量            | 必需 | 默认值                  | 说明                 | 模板中 |
| ------------------- | ---- | ----------------------- | -------------------- | ------ |
| `FRONTEND_URL`      | ✅   | `http://localhost:3000` | 前端应用 URL         | ✅     |
| `REVALIDATE_SECRET` | ✅   | `changethis...`         | Next.js 缓存失效密钥 | ✅     |

### 7. 监控配置 (`monitoring.py`)

| 环境变量                    | 必需 | 默认值                  | 说明                      | 模板中 |
| --------------------------- | ---- | ----------------------- | ------------------------- | ------ |
| `SENTRY_DSN`                | ❌   | -                       | Sentry DSN (留空则不启用) | ✅     |
| `SENTRY_ENVIRONMENT`        | ❌   | `development`           | Sentry 环境标识           | ✅     |
| `SENTRY_TRACES_SAMPLE_RATE` | ❌   | `0.1`                   | Sentry 性能追踪采样率     | ✅     |
| `ENABLE_OPENTELEMETRY`      | ❌   | `False`                 | 是否启用 OpenTelemetry    | ✅     |
| `OTEL_EXPORTER_ENDPOINT`    | ❌   | `http://localhost:4317` | OTLP Exporter 端点        | ✅     |
| `SLOW_REQUEST_THRESHOLD`    | ❌   | `1.0`                   | 慢请求阈值（秒）          | ✅     |

---

## 🎯 生产环境必须配置的变量

以下是生产环境**必须修改**的环境变量（标记为 `CHANGEME`）：

### 🔴 高优先级（安全相关）

1. **`SECRET_KEY`** - JWT 签名密钥

   ```bash
   # 生成方法
   openssl rand -hex 32
   ```

2. **`POSTGRES_PASSWORD`** - 数据库密码

   ```bash
   # 生成强密码
   openssl rand -base64 24
   ```

3. **`FIRST_SUPERUSER_PASSWORD`** - 管理员密码

   - 建议使用强密码，至少 12 位，包含大小写字母、数字和特殊字符

4. **`REVALIDATE_SECRET`** - Next.js 缓存失效密钥
   ```bash
   openssl rand -hex 32
   ```

### 🟡 中优先级（功能相关）

5. **`DOMAIN_NAME`** - 前端域名

   - 例如: `www.yourblog.com`

6. **`API_DOMAIN_NAME`** - 后端 API 域名

   - 例如: `api.yourblog.com`

7. **`DATABASE_URL`** - 数据库连接串

   - 格式: `postgresql://用户名:密码@主机:端口/数据库名`
   - 注意：密码要与 `POSTGRES_PASSWORD` 一致

8. **`BASE_URL`** - 后端公网地址

   - 例如: `https://api.yourblog.com`

9. **`MEDIA_URL`** - 媒体文件访问 URL

   - 例如: `https://api.yourblog.com/media/`

10. **`BACKEND_CORS_ORIGINS`** - CORS 跨域配置

    - 格式: `"https://www.yourblog.com,https://api.yourblog.com"`

11. **`NEXT_PUBLIC_API_URL`** - 前端访问的 API 地址

    - 例如: `https://api.yourblog.com`

12. **`FRONTEND_URL`** - 前端站点 URL
    - 例如: `https://www.yourblog.com`

---

## 🔍 配置验证

### 检查配置是否完整

在服务器上运行以下命令检查配置：

```bash
cd /home/tomy/blog_fr

# 检查 .env 文件是否存在
ls -la .env

# 检查是否还有 CHANGEME 字段未修改
grep -n "CHANGEME" .env

# 如果有输出，说明还有字段需要修改
```

### 验证配置是否生效

```bash
# 启动服务
docker compose up -d

# 查看后端日志，检查是否有配置错误
docker compose logs backend | grep -i error

# 测试超级管理员是否创建成功
docker compose exec backend python -m app.initial_data
```

---

## 📝 配置示例

### 完整的生产环境配置示例

```bash
# 1. 基础配置
ENVIRONMENT=production
API_VERSION=v1
API_PREFIX=/api/v1
BASE_URL=https://api.myblog.com

# 2. 域名配置
DOMAIN_NAME=www.myblog.com
API_DOMAIN_NAME=api.myblog.com

# 3. 数据库配置
POSTGRES_SERVER=db
POSTGRES_PORT=5432
POSTGRES_DB=blog_fr
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Xy9#mK2$pL8@qR5!vN3
DATABASE_URL=postgresql://postgres:Xy9#mK2$pL8@qR5!vN3@db:5432/blog_fr
DATABASE_ECHO=False

# 4. 安全配置
SECRET_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
ACCESS_TOKEN_EXPIRE_MINUTES=10080
FIRST_SUPERUSER=admin
FIRST_SUPERUSER_PASSWORD=MySecureAdminPass123!
FIRST_SUPERUSER_EMAIL=admin@myblog.com
BACKEND_CORS_ORIGINS="https://www.myblog.com,https://api.myblog.com"

# 5. 媒体配置
MEDIA_ROOT=media
MEDIA_URL=https://api.myblog.com/media/

# 6. GitOps 配置
CONTENT_DIR=/git_root/content
GIT_AUTO_CREATE_CATEGORIES=True
GIT_STRICT_STRUCTURE=False
GIT_DEFAULT_CATEGORY=uncategorized

# 7. 前端配置
NEXT_PUBLIC_API_URL=https://api.myblog.com
FRONTEND_URL=https://www.myblog.com
BACKEND_INTERNAL_URL=http://backend:8000
REVALIDATE_SECRET=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4

# 8. 监控配置（可选）
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## 🆘 常见问题

### Q1: 超级管理员创建失败？

**检查**:

- `FIRST_SUPERUSER` 是否设置
- `FIRST_SUPERUSER_PASSWORD` 是否设置
- `FIRST_SUPERUSER_EMAIL` 是否设置
- 数据库连接是否正常

**解决**:

```bash
# 手动运行初始化脚本
docker compose exec backend python -m app.initial_data
```

### Q2: CORS 错误？

**检查**:

- `BACKEND_CORS_ORIGINS` 是否包含前端域名
- 格式是否正确（JSON 数组格式的字符串）

**正确格式**:

```bash
BACKEND_CORS_ORIGINS="https://www.myblog.com,https://api.myblog.com"
```

### Q3: 媒体文件无法访问？

**检查**:

- `MEDIA_URL` 是否正确配置
- `BASE_URL` 是否正确配置
- Caddy 反向代理是否正确配置

---

## 📚 相关文档

- [.env.production.template](./.env.production.template) - 生产环境配置模板
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 部署指南
- [backend/app/core/config/](./backend/app/core/config/) - 配置文件源码

---

**配置完成后，记得重启服务使配置生效！** 🚀
