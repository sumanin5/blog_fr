# PostgreSQL 数据库实践教程

本教程将带你从零开始学习 PostgreSQL 的基本操作，包括创建数据库、用户管理、以及与数据迁移工具的配合使用。

---

## 目录

1. [进入 PostgreSQL](#进入-postgresql)
2. [数据库操作](#数据库操作)
3. [用户管理](#用户管理)
4. [权限配置](#权限配置)
5. [数据迁移 (Alembic)](#数据迁移-alembic)
6. [清理操作](#清理操作)
7. [常用命令速查表](#常用命令速查表)

---

## 进入 PostgreSQL

### 方式一：通过 Docker 进入

```bash
# 进入正在运行的 PostgreSQL 容器
docker compose exec db bash

# 然后连接数据库
psql -U postgres
```

### 方式二：直接连接（推荐）

```bash
# 一步到位，直接进入 PostgreSQL 命令行
docker compose exec db psql -U postgres
```

### 方式三：连接到指定数据库

```bash
# 连接到 blog_fr 数据库
docker compose exec db psql -U postgres -d blog_fr
```

### 连接成功后的界面

```
psql (17.0)
Type "help" for help.

postgres=#
```

- `postgres=#` 表示你当前在 `postgres` 数据库中
- `#` 表示你是超级用户，普通用户会显示 `>`

---

## 数据库操作

### 查看所有数据库

```sql
-- 方式一：SQL 命令
SELECT datname FROM pg_database;

-- 方式二：psql 快捷命令（推荐）
\l
```

输出示例：
```
                                  List of databases
   Name    |  Owner   | Encoding |  Collate   |   Ctype    |   Access privileges
-----------+----------+----------+------------+------------+-----------------------
 blog_fr   | postgres | UTF8     | en_US.utf8 | en_US.utf8 |
 postgres  | postgres | UTF8     | en_US.utf8 | en_US.utf8 |
 template0 | postgres | UTF8     | en_US.utf8 | en_US.utf8 | =c/postgres
 template1 | postgres | UTF8     | en_US.utf8 | en_US.utf8 | =c/postgres
```

### 创建数据库

```sql
-- 基本创建
CREATE DATABASE test_db;

-- 指定所有者
CREATE DATABASE test_db OWNER myuser;

-- 指定编码（推荐）
CREATE DATABASE test_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TEMPLATE = template0;
```

### 切换数据库

```sql
-- 连接到另一个数据库
\c test_db

-- 或者带用户名
\c test_db postgres
```

输出：
```
You are now connected to database "test_db" as user "postgres".
test_db=#
```

### 查看当前数据库信息

```sql
-- 查看当前连接的数据库
SELECT current_database();

-- 查看当前用户
SELECT current_user;

-- 查看数据库大小
SELECT pg_size_pretty(pg_database_size('blog_fr'));
```

### 删除数据库

```sql
-- 删除数据库（必须先断开所有连接）
DROP DATABASE test_db;

-- 如果数据库不存在也不报错
DROP DATABASE IF EXISTS test_db;
```

⚠️ **注意**：不能删除当前连接的数据库，需要先切换到其他数据库。

---

## 用户管理

### 查看所有用户

```sql
-- 方式一：SQL 查询
SELECT usename, usesuper, usecreatedb FROM pg_user;

-- 方式二：psql 快捷命令
\du
```

输出示例：
```
                                   List of roles
 Role name |                         Attributes
-----------+------------------------------------------------------------
 postgres  | Superuser, Create role, Create DB, Replication, Bypass RLS
```

### 创建用户

```sql
-- 基本创建（没有任何权限）
CREATE USER test_user WITH PASSWORD 'test123';

-- 创建有更多权限的用户
CREATE USER app_user WITH
    PASSWORD 'secure_password'
    CREATEDB                    -- 允许创建数据库
    LOGIN;                      -- 允许登录（默认就有）

-- 创建超级用户（谨慎使用！）
CREATE USER admin_user WITH
    PASSWORD 'admin123'
    SUPERUSER;
```

### 用户属性说明

| 属性 | 说明 |
|------|------|
| `SUPERUSER` | 超级用户，拥有所有权限 |
| `CREATEDB` | 可以创建数据库 |
| `CREATEROLE` | 可以创建其他用户 |
| `LOGIN` | 可以登录（默认有） |
| `NOLOGIN` | 不能登录（用于角色继承） |
| `REPLICATION` | 可以用于数据复制 |

### 修改用户

```sql
-- 修改密码
ALTER USER test_user WITH PASSWORD 'new_password';

-- 添加权限
ALTER USER test_user WITH CREATEDB;

-- 移除权限
ALTER USER test_user WITH NOCREATEDB;

-- 重命名用户
ALTER USER test_user RENAME TO new_user;
```

### 删除用户

```sql
-- 删除用户（用户不能拥有任何对象）
DROP USER test_user;

-- 如果用户不存在也不报错
DROP USER IF EXISTS test_user;
```

⚠️ **注意**：如果用户拥有数据库或表，需要先转移所有权或删除这些对象。

---

## 权限配置

### 授予数据库权限

```sql
-- 允许用户连接到数据库
GRANT CONNECT ON DATABASE blog_fr TO app_user;

-- 允许用户在数据库中创建 schema
GRANT CREATE ON DATABASE blog_fr TO app_user;

-- 授予所有数据库权限
GRANT ALL PRIVILEGES ON DATABASE blog_fr TO app_user;
```

### 授予表权限

```sql
-- 首先切换到目标数据库
\c blog_fr

-- 授予单个表的权限
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO app_user;

-- 授予 schema 中所有表的权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;

-- 授予未来创建的表的权限（重要！）
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES TO app_user;
```

### 撤销权限

```sql
-- 撤销表权限
REVOKE ALL PRIVILEGES ON TABLE users FROM app_user;

-- 撤销数据库权限
REVOKE ALL PRIVILEGES ON DATABASE blog_fr FROM app_user;
```

### 查看权限

```sql
-- 查看表的权限
\dp

-- 查看用户的权限
\du+
```

---

## 数据迁移 (Alembic)

### 什么是数据迁移？

数据迁移是一种**版本控制数据库结构**的方式：

```
迁移文件 1: 创建 users 表
    ↓
迁移文件 2: 添加 email 字段
    ↓
迁移文件 3: 创建 posts 表
    ↓
迁移文件 4: 添加外键关联
```

**好处**：
- 团队成员可以同步数据库结构变化
- 可以回滚到之前的版本
- 生产环境部署时自动更新数据库

### Alembic 工作流程

```
┌─────────────────┐
│  SQLAlchemy     │  ← 你用 Python 定义数据模型
│  Models         │
└────────┬────────┘
         │ alembic revision --autogenerate
         ▼
┌─────────────────┐
│  Migration      │  ← Alembic 生成迁移脚本
│  Scripts        │
└────────┬────────┘
         │ alembic upgrade head
         ▼
┌─────────────────┐
│  PostgreSQL     │  ← 数据库结构被更新
│  Database       │
└─────────────────┘
```

### 安装 Alembic

```bash
# 在你的 pyproject.toml 中添加依赖
uv add alembic sqlalchemy psycopg2-binary

# 或者用 pip
pip install alembic sqlalchemy psycopg2-binary
```

### 初始化 Alembic

```bash
# 在 backend 目录下
cd backend

# 初始化 Alembic（创建 alembic 目录和 alembic.ini）
alembic init alembic
```

生成的目录结构：
```
backend/
├── alembic/
│   ├── versions/          # 迁移脚本存放目录
│   ├── env.py             # Alembic 环境配置
│   ├── script.py.mako     # 迁移脚本模板
│   └── README
├── alembic.ini            # Alembic 配置文件
└── app/
    └── models.py          # 你的数据模型
```

### 配置 Alembic

#### 1. 修改 `alembic.ini`

```ini
# 注释掉这行，我们在 env.py 中动态设置
# sqlalchemy.url = driver://user:pass@localhost/dbname
```

#### 2. 修改 `alembic/env.py`

```python
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# 导入你的模型基类
from app.models import Base  # 根据你的项目结构调整

# this is the Alembic Config object
config = context.config

# 从环境变量获取数据库 URL
database_url = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/blog_fr"
)
config.set_main_option("sqlalchemy.url", database_url)

# 设置目标元数据（让 Alembic 知道你的模型）
target_metadata = Base.metadata

# ... 其余代码保持不变
```

### 创建数据模型示例

```python
# app/models.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关联
    posts = relationship("Post", back_populates="author")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联
    author = relationship("User", back_populates="posts")
```

### 生成迁移脚本

```bash
# 自动检测模型变化并生成迁移脚本
alembic revision --autogenerate -m "create users and posts tables"
```

生成的迁移文件 (`alembic/versions/xxxx_create_users_and_posts_tables.py`)：

```python
"""create users and posts tables

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2025-11-29 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'a1b2c3d4e5f6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # 创建 users 表
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # 创建 posts 表
    op.create_table('posts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_posts_id'), 'posts', ['id'], unique=False)


def downgrade():
    # 回滚：删除表
    op.drop_index(op.f('ix_posts_id'), table_name='posts')
    op.drop_table('posts')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
```

### 执行迁移

```bash
# 升级到最新版本
alembic upgrade head

# 升级到指定版本
alembic upgrade a1b2c3d4e5f6

# 升级一个版本
alembic upgrade +1
```

### 回滚迁移

```bash
# 回滚一个版本
alembic downgrade -1

# 回滚到指定版本
alembic downgrade a1b2c3d4e5f6

# 回滚所有迁移
alembic downgrade base
```

### 查看迁移状态

```bash
# 查看当前版本
alembic current

# 查看迁移历史
alembic history

# 查看详细历史
alembic history --verbose
```

### Docker 中执行迁移

```bash
# 在容器中执行迁移
docker compose exec backend alembic upgrade head

# 或者通过 prestart 脚本自动执行
# scripts/prestart.sh
#!/bin/bash
set -e
echo "Running database migrations..."
alembic upgrade head
echo "Migrations completed!"
```

---

## 清理操作

### 完整清理流程

按照依赖顺序删除，先删除依赖项，再删除被依赖项。

```sql
-- 1. 连接到 postgres 数据库（不能删除当前连接的数据库）
\c postgres

-- 2. 强制断开 test_db 的所有连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'test_db';

-- 3. 删除数据库
DROP DATABASE IF EXISTS test_db;

-- 4. 删除用户拥有的对象（如果有）
-- 首先转移所有权给 postgres
REASSIGN OWNED BY test_user TO postgres;

-- 然后删除用户的权限
DROP OWNED BY test_user;

-- 5. 删除用户
DROP USER IF EXISTS test_user;

-- 6. 验证删除
\l   -- 查看数据库列表
\du  -- 查看用户列表
```

### 一键清理脚本

创建一个 SQL 脚本 `cleanup.sql`：

```sql
-- cleanup.sql
-- 清理测试数据库和用户

-- 切换到 postgres 数据库
\c postgres

-- 断开 test_db 的所有连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'test_db' AND pid <> pg_backend_pid();

-- 删除数据库
DROP DATABASE IF EXISTS test_db;

-- 清理用户权限和对象
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'test_user') THEN
        REASSIGN OWNED BY test_user TO postgres;
        DROP OWNED BY test_user;
    END IF;
END $$;

-- 删除用户
DROP USER IF EXISTS test_user;

-- 确认
\echo '=== 清理完成 ==='
\echo '当前数据库列表：'
\l
\echo '当前用户列表：'
\du
```

执行脚本：

```bash
# 在容器中执行
docker compose exec db psql -U postgres -f /path/to/cleanup.sql

# 或者直接传入
cat cleanup.sql | docker compose exec -T db psql -U postgres
```

### Docker 层面的清理

```bash
# 停止并删除容器（保留数据卷）
docker compose down

# 停止并删除容器和数据卷（⚠️ 会删除所有数据！）
docker compose down -v

# 删除特定的数据卷
docker volume rm blog_fr_postgres_data

# 查看所有数据卷
docker volume ls

# 清理未使用的数据卷
docker volume prune
```

---

## 常用命令速查表

### psql 快捷命令

| 命令 | 说明 |
|------|------|
| `\l` | 列出所有数据库 |
| `\c dbname` | 切换到指定数据库 |
| `\dt` | 列出当前数据库的所有表 |
| `\d tablename` | 查看表结构 |
| `\du` | 列出所有用户/角色 |
| `\dp` | 显示表的权限 |
| `\dn` | 列出所有 schema |
| `\df` | 列出所有函数 |
| `\di` | 列出所有索引 |
| `\q` | 退出 psql |
| `\?` | 显示所有快捷命令帮助 |
| `\h` | 显示 SQL 命令帮助 |
| `\h CREATE TABLE` | 显示特定命令的帮助 |

### SQL 常用命令

```sql
-- 数据库操作
CREATE DATABASE dbname;
DROP DATABASE dbname;
ALTER DATABASE dbname RENAME TO newname;

-- 用户操作
CREATE USER username WITH PASSWORD 'password';
ALTER USER username WITH PASSWORD 'newpassword';
DROP USER username;

-- 权限操作
GRANT ALL PRIVILEGES ON DATABASE dbname TO username;
REVOKE ALL PRIVILEGES ON DATABASE dbname FROM username;

-- 表操作
CREATE TABLE tablename (column definitions);
DROP TABLE tablename;
ALTER TABLE tablename ADD COLUMN columnname datatype;
ALTER TABLE tablename DROP COLUMN columnname;

-- 查询
SELECT * FROM tablename;
SELECT * FROM tablename WHERE condition;
SELECT COUNT(*) FROM tablename;
```

### Alembic 命令速查

| 命令 | 说明 |
|------|------|
| `alembic init alembic` | 初始化 Alembic |
| `alembic revision -m "message"` | 创建空迁移脚本 |
| `alembic revision --autogenerate -m "message"` | 自动生成迁移脚本 |
| `alembic upgrade head` | 升级到最新版本 |
| `alembic upgrade +1` | 升级一个版本 |
| `alembic downgrade -1` | 回滚一个版本 |
| `alembic downgrade base` | 回滚所有迁移 |
| `alembic current` | 查看当前版本 |
| `alembic history` | 查看迁移历史 |
| `alembic heads` | 查看所有头版本 |
| `alembic branches` | 查看分支 |

---

## 实践练习

### 练习 1：创建测试环境

```bash
# 进入 PostgreSQL
docker compose exec db psql -U postgres
```

```sql
-- 1. 创建测试数据库
CREATE DATABASE test_db;

-- 2. 创建测试用户
CREATE USER test_user WITH PASSWORD 'test123';

-- 3. 授予权限
GRANT ALL PRIVILEGES ON DATABASE test_db TO test_user;

-- 4. 切换到测试数据库
\c test_db

-- 5. 授予 schema 权限
GRANT ALL ON SCHEMA public TO test_user;

-- 6. 创建一个测试表
CREATE TABLE test_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 插入测试数据
INSERT INTO test_table (name) VALUES ('测试数据1'), ('测试数据2');

-- 8. 查询数据
SELECT * FROM test_table;
```

### 练习 2：用测试用户登录

```bash
# 用测试用户连接
docker compose exec db psql -U test_user -d test_db
```

```sql
-- 验证权限
SELECT * FROM test_table;
INSERT INTO test_table (name) VALUES ('用户插入的数据');
SELECT * FROM test_table;
```

### 练习 3：清理测试环境

```bash
# 回到超级用户
docker compose exec db psql -U postgres
```

```sql
-- 按顺序清理
\c postgres
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'test_db';
DROP DATABASE test_db;
DROP USER test_user;

-- 验证
\l
\du
```

---

## 总结

| 概念 | 说明 |
|------|------|
| **数据库** | 数据的容器，一个 PostgreSQL 实例可以有多个数据库 |
| **用户/角色** | 登录凭证和权限的集合 |
| **权限** | 控制谁能对什么对象做什么操作 |
| **数据迁移** | 版本控制数据库结构的方式 |
| **Alembic** | Python 生态最流行的数据迁移工具 |

### 最佳实践

1. **生产环境不要用 postgres 超级用户**：为应用创建专用用户
2. **使用强密码**：至少 16 个字符，包含大小写、数字、特殊字符
3. **最小权限原则**：只授予必要的权限
4. **定期备份**：使用 `pg_dump` 备份数据
5. **使用迁移工具**：不要手动修改生产数据库结构
