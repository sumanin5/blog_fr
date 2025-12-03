# Core 模块说明文档

## 📁 目录结构

```
app/core/
├── __init__.py       # 模块初始化
├── config.py         # 应用配置
├── db.py            # 数据库连接
├── base.py          # 基础模型
└── security.py      # 安全模块
```

---

## 📄 文件说明

### 1. `config.py` - 应用配置

**作用**：集中管理所有应用配置

**主要内容**：

- 环境变量读取
- 数据库连接配置
- JWT 密钥配置
- 应用设置

**使用示例**：

```python
from app.core.config import settings

# 获取数据库 URL
db_url = settings.postgres_url

# 获取 JWT 密钥
secret_key = settings.SECRET_KEY

# 获取访问令牌过期时间
token_expire = settings.ACCESS_TOKEN_EXPIRE_MINUTES
```

**关键特性**：

- 使用 Pydantic Settings 自动验证配置
- 支持 `.env` 文件
- 类型安全的配置访问

---

### 2. `db.py` - 数据库连接

**作用**：提供数据库引擎和会话管理

**主要内容**：

- 异步数据库引擎（`async_engine`）
- 同步数据库引擎（`sync_engine`）
- 异步会话依赖项（`get_async_session`）
- 同步会话依赖项（`get_sync_session`）

**使用示例**：

#### 在 FastAPI 路由中（推荐异步）

```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session

@router.get("/users")
async def get_users(
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(select(User))
    return result.scalars().all()
```

#### 在脚本/Notebook 中（同步）

```python
from app.core.db import sync_engine
from sqlmodel import Session

with Session(sync_engine) as session:
    user = session.get(User, 1)
    print(user)
```

**关键特性**：

- 异步优先，提高并发性能
- 自动管理会话生命周期
- 支持依赖注入

---

### 3. `base.py` - 基础模型

**作用**：提供所有数据库模型的基类

**主要内容**：

- `Base` 类：包含公共字段
  - `id`: 主键（自增）
  - `created_at`: 创建时间
  - `updated_at`: 更新时间
- 时间工具函数

**使用示例**：

```python
from app.core.base import Base
from sqlmodel import Field

class User(Base, table=True):
    """用户表"""
    __tablename__ = "users"

    username: str = Field(unique=True)
    email: str = Field(unique=True)
    # id, created_at, updated_at 自动继承
```

**关键特性**：

- 自动添加 `id`, `created_at`, `updated_at` 字段
- 使用上海时区（UTC+8）
- `updated_at` 自动更新

**时间字段说明**：

```python
# created_at: 记录创建时间（只写入一次）
# updated_at: 记录最后更新时间（每次更新自动刷新）

user = User(username="alice", email="alice@example.com")
session.add(user)
await session.commit()
# created_at: 2025-12-02 18:00:00
# updated_at: 2025-12-02 18:00:00

user.username = "alice_new"
await session.commit()
# created_at: 2025-12-02 18:00:00 (不变)
# updated_at: 2025-12-02 18:05:00 (自动更新)
```

---

### 4. `security.py` - 安全模块

**作用**：提供密码加密和 JWT 令牌管理

**主要内容**：

- 密码哈希（`get_password_hash`）
- 密码验证（`verify_password`）
- JWT 令牌生成（`create_access_token`）

**使用示例**：

#### 用户注册（密码加密）

```python
from app.core.security import get_password_hash

# 注册时加密密码
hashed_password = get_password_hash("user_password123")
user = User(
    username="alice",
    email="alice@example.com",
    hashed_password=hashed_password
)
```

#### 用户登录（密码验证）

```python
from app.core.security import verify_password

# 登录时验证密码
if verify_password(input_password, user.hashed_password):
    print("密码正确")
else:
    print("密码错误")
```

#### 生成 JWT 令牌

```python
from app.core.security import create_access_token
from datetime import timedelta

# 生成访问令牌（24 小时有效）
token = create_access_token(
    subject=str(user.id),
    expires_delta=timedelta(hours=24)
)
# 返回给客户端
return {"access_token": token, "token_type": "bearer"}
```

**关键特性**：

- 使用 bcrypt 算法加密密码
- 自动生成盐值，防止彩虹表攻击
- JWT 令牌包含过期时间
- 使用 HS256 算法签名

**安全最佳实践**：

```python
# ✅ 正确：存储哈希密码
user.hashed_password = get_password_hash(password)

# ❌ 错误：存储明文密码
user.password = password  # 永远不要这样做！

# ✅ 正确：验证密码
if verify_password(input_password, user.hashed_password):
    # 登录成功
    pass

# ❌ 错误：直接比较密码
if input_password == user.password:  # 不安全！
    pass
```

---

## 🔗 模块之间的关系

```
config.py
  ↓ 提供配置
db.py (使用 config.py 的数据库 URL)
  ↓ 提供数据库会话
base.py (定义基础模型)
  ↓ 被业务模型继承
users/model.py (继承 Base)
  ↓ 使用
users/crud.py (使用 security.py 加密密码)
  ↓ 被调用
users/router.py (使用 db.py 的会话)
```

---

## 🚀 快速开始

### 1. 配置环境变量

创建 `.env` 文件：

```env
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=mydb
SECRET_KEY=your-secret-key-here
```

### 2. 导入配置

```python
from app.core.config import settings
from app.core.db import get_async_session
from app.core.security import get_password_hash, verify_password
```

### 3. 创建数据库模型

```python
from app.core.base import Base
from sqlmodel import Field

class Product(Base, table=True):
    __tablename__ = "products"
    name: str = Field(index=True)
    price: float
```

### 4. 在路由中使用

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session

router = APIRouter()

@router.get("/products")
async def get_products(
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(select(Product))
    return result.scalars().all()
```

---

## 📋 常见问题

### Q1: 什么时候使用异步会话？

**A**: 在 FastAPI 路由中始终使用异步会话（`get_async_session`），在脚本/Notebook 中使用同步会话（`get_sync_session`）。

### Q2: 如何修改时区？

**A**: 修改 `base.py` 中的 `get_now_shanghai_naive` 函数：

```python
def get_now_utc() -> datetime:
    return datetime.utcnow()  # 使用 UTC 时区
```

### Q3: 如何自定义基础模型？

**A**: 继承 `Base` 类并添加自定义字段：

```python
class MyBase(Base):
    is_deleted: bool = Field(default=False)  # 软删除标记

class User(MyBase, table=True):
    # 自动包含 id, created_at, updated_at, is_deleted
    username: str
```

### Q4: JWT 令牌过期时间如何配置？

**A**: 在 `config.py` 中设置 `ACCESS_TOKEN_EXPIRE_MINUTES`：

```python
# .env 文件
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 小时
```

---

## 🔐 安全注意事项

1. **SECRET_KEY 必须保密**

   - 不要提交到 Git
   - 使用环境变量
   - 生产环境使用强随机密钥

2. **密码永远不要明文存储**

   - 始终使用 `get_password_hash`
   - 验证时使用 `verify_password`

3. **JWT 令牌应该有过期时间**

   - 不要设置过长的有效期
   - 考虑使用刷新令牌机制

4. **数据库连接字符串不要硬编码**
   - 使用环境变量
   - 不同环境使用不同的配置

---

## 📚 相关资源

- [Pydantic Settings 文档](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [SQLAlchemy 异步文档](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [PyJWT 文档](https://pyjwt.readthedocs.io/)
- [Passlib 文档](https://passlib.readthedocs.io/)
