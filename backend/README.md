# Blog FR - Backend API

一个基于 FastAPI + PostgreSQL + SQLModel 的博客后端服务。

---

## 🚀 快速开始

### 前置要求

- Docker & Docker Compose
- Python 3.13+
- PostgreSQL 17（可选，用 Docker）

### 启动服务

```bash
# 从项目根目录启动（包含数据库）
cd ..
docker compose up backend

# 或者只启动后端（需要数据库已运行）
docker compose up -d db
docker compose up backend
```

访问 API：`http://localhost:8000`
API 文档：

- Swagger UI: `http://localhost:8000/docs`
- Scalar UI: `http://localhost:8000/scalar`（更现代化）
- OpenAPI JSON: `http://localhost:8000/openapi.json`

---

## 📖 API 文档

### 在线文档

项目提供了两种交互式 API 文档界面：

#### 1. Swagger UI（传统）

访问：`http://localhost:8000/docs`

**特点**：

- ✅ 完整的接口列表
- ✅ 在线测试功能
- ✅ 请求/响应示例
- ✅ 认证支持（Bearer Token）

#### 2. Scalar UI（推荐）

访问：`http://localhost:8000/scalar`

**特点**：

- ✅ 更现代化的界面
- ✅ 更好的代码示例
- ✅ 支持多种编程语言
- ✅ 更清晰的文档结构

### API 模块

| 模块   | 前缀              | 说明                     |
| ------ | ----------------- | ------------------------ |
| Users  | `/api/v1/users`   | 用户认证和管理           |
| Posts  | `/api/v1/posts`   | 文章创建、编辑、查询     |
| Media  | `/api/v1/media`   | 媒体文件上传和管理       |
| GitOps | `/api/v1/ops/git` | Git 自动化同步（管理员） |

### 认证方式

所有需要认证的接口都使用 JWT Bearer Token：

```bash
# 1. 登录获取 token
curl -X POST http://localhost:8000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# 2. 使用 token 访问受保护接口
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer <your_token>"
```

### 导出 OpenAPI 规范

```bash
# 导出 OpenAPI JSON
python scripts/export_openapi.py

# 生成的文件：docs/api/openapi.json
```

---

## 📦 Docker 构建

### 理解多阶段构建

这个项目的 Dockerfile 有两个阶段：

```
development 阶段          production 阶段
    ↓                         ↓
包含所有依赖             只包含运行依赖
• fastapi ✅             • fastapi ✅
• pytest ✅              • pytest ❌
• jupyter ✅             • jupyter ❌
• ipdb ✅                • ipdb ❌
    ↓                         ↓
用于本地开发             用于生产部署
运行测试                 体积小，启动快
交互式调试
```

### 生产镜像（默认）

```bash
# docker-compose 默认构建这个
docker compose build backend

# 或者手动指定
docker build --target production -t blog-fr-prod .

# 运行
docker compose up backend
```

**特点**：

- ✅ 体积小（只有必需依赖）
- ✅ 启动快
- ✅ 安全（没有测试工具）
- ❌ 无法运行测试

### 开发镜像

```bash
# 构建开发镜像
docker build --target development -t blog-fr-dev .

# 交互式运行（进入容器）
docker run -it --rm \
  -v $(pwd):/app \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5433/blog_fr" \
  blog-fr-dev bash

# 在容器内运行 Jupyter
jupyter notebook --ip=0.0.0.0 --allow-root

# 或运行测试
pytest tests/
```

---

## 💻 本地开发（推荐）

### 1. 安装依赖

```bash
cd backend

# 安装所有依赖（包括开发工具）
uv sync --all-extras
```

### 2. 启动后端

```bash
# 方式 A：使用 Docker 数据库
docker compose up -d db  # 先启动数据库

# 然后本地启动后端（有热更新）
fastapi run app/main.py --reload

# 或者
uv run fastapi run app/main.py --reload
```

### 3. 启动 Jupyter（可选）

```bash
jupyter notebook
```

在浏览器打开 `http://localhost:8888`

### 4. 运行测试

```bash
# 运行所有测试
pytest

# 运行特定文件的测试
pytest tests/test_api.py

# 显示详细输出
pytest -v

# 运行并显示打印语句
pytest -s
```

---

## 🛡️ 错误处理模式

### 统一的全局异常处理

本项目采用了 **FastAPI 全局异常处理器模式**，这是一个**标准且优秀**的企业级实践。

#### 核心特点

1. **统一响应结构**

   所有错误响应都遵循统一的 JSON 格式：

   ```json
   {
     "error": {
       "code": "ERROR_CODE",
       "message": "Human readable message",
       "details": { ... },
       "timestamp": "2026-01-24T10:00:00Z",
       "request_id": "uuid"
     }
   }
   ```

2. **集中式处理**

   在 `app/main.py` 中使用 `app.add_exception_handler` 注册处理器：

   ```python
   app.add_exception_handler(BaseAppException, app_exception_handler)
   app.add_exception_handler(RequestValidationError, validation_exception_handler)
   app.add_exception_handler(SQLAlchemyError, database_exception_handler)
   app.add_exception_handler(Exception, unexpected_exception_handler)
   ```

3. **环境隔离**

   - **开发环境**: 返回详细的报错信息和 Traceback，方便调试
   - **生产环境**: 隐藏敏感信息，只返回通用错误消息，防止信息泄露

4. **全链路追踪**
   - 所有错误响应都包含 `request_id`
   - 可以通过 ID 在日志系统中追踪完整请求链路

#### 异常处理器类型

| 处理器                         | 捕获异常                 | HTTP 状态码 | 说明             |
| ------------------------------ | ------------------------ | ----------- | ---------------- |
| `app_exception_handler`        | `BaseAppException`       | 自定义      | 业务逻辑异常     |
| `validation_exception_handler` | `RequestValidationError` | 422         | 请求参数验证失败 |
| `database_exception_handler`   | `SQLAlchemyError`        | 500         | 数据库操作异常   |
| `unexpected_exception_handler` | `Exception`              | 500         | 未预期的系统异常 |

#### 为什么这是标准模式？

这套错误处理模式在 FastAPI 和现代 Python Web 开发中非常通用，它：

- ✅ **解耦**: 业务逻辑与错误响应格式分离
- ✅ **安全**: 生产环境隐藏敏感信息
- ✅ **可观测**: 通过 request_id 实现全链路追踪
- ✅ **前端友好**: 统一的响应格式降低前端处理复杂度
- ✅ **可扩展**: 易于添加新的异常类型和处理器

#### 使用示例

```python
# 业务代码中只需抛出异常
from app.core.exceptions import BaseAppException

class PostNotFoundError(BaseAppException):
    def __init__(self, post_id: str):
        super().__init__(
            message=f"Post {post_id} not found",
            status_code=404,
            error_code="POST_NOT_FOUND"
        )

# 在路由中使用
@router.get("/posts/{post_id}")
async def get_post(post_id: str):
    post = await post_service.get_post(post_id)
    if not post:
        raise PostNotFoundError(post_id)  # 自动转换为 JSON 响应
    return post
```

详细实现见 `app/core/error_handlers.py` 和 `app/core/exceptions.py`。

---

## 🗂️ 项目结构

```
backend/
├── app/
│   ├── main.py          # FastAPI 应用入口
│   ├── models.py        # 数据库模型 (SQLModel)
│   ├── schemas.py       # 请求/响应数据模型
│   ├── api/
│   │   └── routes/      # API 路由
│   └── db/
│       └── session.py   # 数据库会话
├── tests/               # 单元测试
├── alembic/             # 数据库迁移
├── Dockerfile           # 多阶段构建
├── pyproject.toml       # 项目配置 + 依赖
└── README.md            # 本文件
```

---

## 🗄️ 数据库

### 连接信息

| 项目     | 值                                |
| -------- | --------------------------------- |
| Host     | `localhost` 或 `db`（容器内）     |
| Port     | `5433`（本地）或 `5432`（容器内） |
| User     | `postgres`                        |
| Password | `postgres`                        |
| Database | `blog_fr`                         |

详见项目根目录的 `.env` 文件。

### 数据库迁移

```bash
# 创建新迁移
alembic revision --autogenerate -m "add avatar column"

# 执行迁移
alembic upgrade head

# 回滚一个版本
alembic downgrade -1
```

### 查看数据库

```bash
# 通过命令行
docker compose exec db psql -U postgres -d blog_fr

# 通过 Adminer Web 界面
# 访问 http://localhost:8080（如果已启动）
```

---

## 🔧 依赖管理

### 添加依赖

```bash
# 添加到主依赖
uv add fastapi

# 添加到开发依赖
uv add --group dev pytest

# 锁定依赖
uv lock
```

### 主要依赖

| 包         | 用途            |
| ---------- | --------------- |
| `fastapi`  | Web 框架        |
| `uvicorn`  | ASGI 服务器     |
| `sqlmodel` | ORM + 数据验证  |
| `psycopg2` | PostgreSQL 驱动 |
| `alembic`  | 数据库迁移      |
| `pyjwt`    | JWT 认证        |
| `passlib`  | 密码哈希        |

### 开发依赖

| 包        | 用途                |
| --------- | ------------------- |
| `pytest`  | 单元测试            |
| `jupyter` | 交互式开发          |
| `ipython` | 增强型 Python Shell |
| `ipdb`    | 交互式调试器        |

---

## 📝 环境变量

复制 `.env.example` 为 `.env`，修改配置：

```bash
cp .env.example .env
```

主要配置：

```env
# 数据库
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=blog_fr

# 后端
ENVIRONMENT=development
SECRET_KEY=your_jwt_secret_key

# 生成安全的 SECRET_KEY
# openssl rand -hex 32
```

---

## 🧪 开发工作流

### 日常开发

```bash
# 终端 1：启动数据库 + 后端（Docker）
docker compose up backend

# 终端 2：启动前端（本地）
cd ../frontend
npm run dev

# 终端 3：运行测试（本地）
cd ../backend
pytest --watch
```

### 测试新功能

```bash
# 创建 Jupyter 笔记本
jupyter notebook

# 快速测试数据库查询
# 在笔记本中：
# from app.db.session import get_db
# db = next(get_db())
# users = db.query(User).all()
```

### 准备部署

```bash
# 构建生产镜像
docker build --target production -t blog-fr-prod .

# 运行生产镜像
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e SECRET_KEY="..." \
  blog-fr-prod
```

---

## 🐛 调试

### 使用 ipdb

```python
import ipdb; ipdb.set_trace()  # 在代码中设置断点
```

### 查看日志

```bash
# 查看容器日志
docker compose logs -f backend

# 查看最后 100 行
docker compose logs --tail 100 backend
```

### 进入容器调试

```bash
# 进入正在运行的容器
docker compose exec backend bash

# 启动 Python REPL
python
>>> from app.main import app
>>> # 现在可以导入你的应用
```

---

## 📚 相关文档

- [FastAPI 官方文档](https://fastapi.tiangolo.com)
- [SQLModel 文档](https://sqlmodel.tiangolo.com)
- [Alembic 文档](https://alembic.sqlalchemy.org)
- [PostgreSQL 文档](https://www.postgresql.org/docs)

---

## 📝 许可证

MIT
