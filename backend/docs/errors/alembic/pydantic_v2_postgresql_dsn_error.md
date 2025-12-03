# 🐛 Alembic 数据迁移错误：PostgresDsn 属性不存在

> **错误日期**：2025-12-02
> **影响范围**：Alembic 数据迁移
> **根本原因**：Pydantic v2 API 变更 + 配置设计过度复杂

---

## 📋 错误现象

执行 Alembic 迁移命令时报错：

```bash
alembic revision --autogenerate -m "create_user_table"
```

错误信息：

```python
AttributeError: 'PostgresDsn' object has no attribute 'username'
```

---

## 🔍 错误原因分析

### 1. Pydantic v2 的 API 变更

在 **Pydantic v1** 中，`PostgresDsn` 对象可以直接访问 URL 组件：

```python
# ❌ Pydantic v1 的写法（v2 中不再支持）
url = PostgresDsn("postgresql://user:pass@host:5432/db")
print(url.username)  # "user"
print(url.password)  # "pass"
print(url.host)      # "host"
```

在 **Pydantic v2** 中，`PostgresDsn` 不再暴露这些属性！它本质上是一个经过验证的字符串，需要用 `urlparse` 解析：

```python
# ✅ Pydantic v2 的正确写法
from urllib.parse import urlparse

url = PostgresDsn("postgresql://user:pass@host:5432/db")
parsed = urlparse(str(url))
print(parsed.username)  # "user"
print(parsed.hostname)  # "host"
```

### 2. 配置设计的根本问题 🎯

我们原来的 `config.py` 设计过于复杂：

```
❌ 原设计思路：
   .env 中分别定义：
   - POSTGRES_SERVER=localhost
   - POSTGRES_PORT=5432
   - POSTGRES_USER=xxx
   - POSTGRES_PASSWORD=xxx
   - POSTGRES_DB=xxx
   - DATABASE_URL=... (可选)

   然后在代码中：
   1. 如果 DATABASE_URL 存在，尝试解析它
   2. 如果不存在，手动拼接各个字段
   3. 还要处理同步/异步驱动的转换
```

这种设计导致了：
- 逻辑复杂，容易出错
- 需要处理 Pydantic v2 的 API 变更
- 维护成本高

---

## 🌐 Docker 端口映射的影响

你的 `docker-compose.dev.yml` 配置：

```yaml
db:
  ports:
    - "5433:5432"  # 宿主机 5433 → 容器 5432
```

这意味着：

| 访问场景 | 主机地址 | 端口 |
|---------|---------|------|
| **容器内部**（backend → db） | `db` | `5432` |
| **宿主机**（本地开发、Jupyter） | `localhost` | `5433` |

### 为什么容器内用 5432？

Docker 网络中，容器之间通过服务名通信，使用的是**容器内部端口**：

```
backend 容器 → db:5432 → PostgreSQL 容器
                ↑
          Docker 内部网络，无需端口映射
```

### 为什么宿主机用 5433？

端口映射是给**宿主机**访问容器用的：

```
宿主机 Jupyter → localhost:5433 → 端口映射 → 容器 5432
```

### 你的 .env 配置问题

```dotenv
# .env 当前配置
POSTGRES_SERVER=localhost    # ← 这是给宿主机用的
POSTGRES_PORT=5432           # ← 错误！宿主机应该用 5433
```

但实际上：
- **Docker 容器内** 用的是 `DATABASE_URL=...@db:5432/...`（正确）
- **宿主机 Jupyter** 用的是 `.env.test` 中的配置

---

## ✅ 最简方案：直接使用 DATABASE_URL

### 核心思想

**不要分开定义各个字段，直接用完整的 DATABASE_URL！**

这样做的好处：
1. 配置简洁，一目了然
2. 不需要解析 URL 组件
3. 同步/异步只需要替换驱动名
4. 避免 Pydantic v2 的 API 问题

### 新的 .env 配置

```dotenv
# ==========================================
# 数据库配置（简化版）
# ==========================================
# Docker 容器内使用（db 是服务名，5432 是容器内部端口）
DATABASE_URL=postgresql://postgres:1547@db:5432/blog_fr

# 以下字段仅用于 docker-compose 初始化数据库
POSTGRES_USER=postgres
POSTGRES_PASSWORD=1547
POSTGRES_DB=blog_fr
```

### 新的 .env.test 配置

```dotenv
# ==========================================
# 测试/本地开发（宿主机访问 Docker）
# ==========================================
ENVIRONMENT=test
DATABASE_URL=postgresql://tomy:1547@localhost:5432/db_test
```

### 新的 config.py（极简版）

```python
import os
from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: Literal["local", "production", "test"] = "local"

    # 直接使用完整的数据库 URL
    database_url: str = Field(..., description="完整的数据库连接 URL")

    # 仅用于 docker-compose 初始化（可选）
    postgres_user: str = ""
    postgres_password: str = ""
    postgres_db: str = ""

    model_config = SettingsConfigDict(
        env_file="../.env.test" if os.getenv("ENVIRONMENT") == "test" else "../.env",
        env_ignore_empty=True,
        extra="ignore",
    )

    @property
    def sync_database_url(self) -> str:
        """同步数据库 URL（psycopg2）"""
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        if "asyncpg" in url:
            return url.replace("+asyncpg", "+psycopg")
        return url

    @property
    def async_database_url(self) -> str:
        """异步数据库 URL（asyncpg）"""
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if "+psycopg" in url:
            return url.replace("+psycopg", "+asyncpg")
        return url


settings = Settings()
```

---

## 📊 方案对比

| 方面 | 原方案（字段拼接） | 新方案（直接 URL） |
|------|------------------|-------------------|
| **配置复杂度** | 6+ 个字段 | 1 个 URL |
| **代码行数** | ~100 行 | ~30 行 |
| **解析 URL** | 需要（踩坑） | 不需要 |
| **Pydantic 兼容** | 需要适配 v2 | 无需适配 |
| **维护成本** | 高 | 低 |
| **出错概率** | 高 | 低 |

---

## 🎯 最终建议

**采用新方案！** 理由：

1. **KISS 原则**：Keep It Simple, Stupid
2. **单一数据源**：DATABASE_URL 是业界标准
3. **环境隔离清晰**：
   - `.env` → Docker 容器内（用 `db:5432`）
   - `.env.test` → 宿主机开发（用 `localhost:5433` 或本地 PG）
4. **字符串替换比 URL 解析更可靠**

---

## 📝 迁移步骤

1. 更新 `.env` 添加 `DATABASE_URL`
2. 更新 `.env.test` 使用正确端口
3. 替换 `config.py` 为简化版
4. 更新 `alembic/env.py` 使用新的属性名
5. 重新运行迁移

```bash
docker compose -f docker-compose.dev.yml exec backend bash
alembic revision --autogenerate -m "create_user_table"
alembic upgrade head
```

---

*文档创建于 2025-12-02*

---

## 📌 附录：其他常见 Alembic 错误

### 错误：`NameError: name 'sqlmodel' is not defined`

当使用 SQLModel 时，自动生成的迁移文件可能包含 `sqlmodel.sql.sqltypes.AutoString()` 但缺少导入。

**解决方法**：在迁移文件顶部添加导入：

```python
import sqlalchemy as sa
import sqlmodel  # ← 添加这行
```

### 错误：`Target database is not up to date`

在生成新迁移前，需要先应用已有的迁移。

**解决方法**：

```bash
alembic upgrade head  # 先升级到最新
alembic revision --autogenerate -m "xxx"  # 再生成新迁移
```
