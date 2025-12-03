# FastAPI 模块结构说明

## 📁 目录结构

```
app/
├── main.py                 # 应用入口
├── core/                   # 核心配置
│   ├── config.py          # 配置文件
│   ├── database.py        # 数据库连接
│   ├── security.py        # 安全模块
│   └── base.py            # 基础模型
└── users/                  # 用户模块
    ├── __init__.py        # 模块初始化
    ├── model.py           # 数据库模型（SQLModel）
    ├── schema.py          # 请求/响应模型（Pydantic）
    ├── crud.py            # 数据库操作
    ├── router.py          # API 路由
    └── dependencies.py    # 依赖项
```

## 📚 各文件的作用

### 1. `model.py` - 数据库模型

**作用**：定义数据库表结构

```python
from sqlmodel import Field
from app.core.base import Base

class User(Base, table=True):
    __tablename__ = "users"
    username: str = Field(unique=True)
    email: str = Field(unique=True)
    hashed_password: str
```

**要点**：

- 继承自 `BaseModel`（包含 `id`, `created_at`, `updated_at`）
- 使用 `Field` 定义字段约束
- 设置 `table=True` 表示这是数据库表

---

### 2. `schema.py` - 请求/响应模型

**作用**：定义 API 的输入输出格式

```python
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    """创建用户的请求模型"""
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """用户响应模型（不包含密码）"""
    id: int
    username: str
    email: str
    is_active: bool
```

**要点**：

- 使用 Pydantic 的 `BaseModel`（不是 SQLModel）
- 请求模型：验证客户端发送的数据
- 响应模型：控制返回给客户端的数据（如隐藏密码）

---

### 3. `crud.py` - 数据库操作

**作用**：封装所有数据库操作

```python
from sqlmodel import Session, select
from app.users.model import User

def create_user(session: Session, user_in: UserCreate) -> User:
    """创建用户"""
    user = User(**user_in.model_dump())
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

def get_user_by_id(session: Session, user_id: int) -> User | None:
    """根据 ID 获取用户"""
    return session.get(User, user_id)
```

**要点**：

- 所有数据库操作都在这里
- 接收 `Session` 作为参数（依赖注入）
- 返回数据库模型对象

---

### 4. `router.py` - API 路由

**作用**：定义 API 接口

```python
from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.core.database import get_session
from app.users import crud
from app.users.schema import UserCreate, UserResponse

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register_user(
    user_in: UserCreate,
    session: Session = Depends(get_session)
):
    """注册新用户"""
    return crud.create_user(session, user_in)
```

**要点**：

- 使用 `APIRouter` 创建路由
- 使用 `Depends` 注入依赖（如数据库会话）
- 使用 `response_model` 指定响应模型

---

### 5. `dependencies.py` - 依赖项

**作用**：提供可复用的依赖项

```python
from fastapi import Depends, HTTPException
from sqlmodel import Session
from app.users.model import User

def get_current_user(
    session: Session = Depends(get_session),
    token: str = Depends(oauth2_scheme)
) -> User:
    """获取当前登录用户"""
    # 验证 token，返回用户
    ...
```

**要点**：

- 封装可复用的逻辑（如获取当前用户、权限验证）
- 可以在多个路由中使用

---

### 6. `__init__.py` - 模块初始化

**作用**：导出模块的公共接口

```python
from app.users.router import router

__all__ = ["router"]
```

---

## 🔗 如何与 `main.py` 联合

### `main.py` 的作用

```python
from fastapi import FastAPI
from app.users.router import router as users_router

app = FastAPI()

# 包含用户路由
app.include_router(
    users_router,
    prefix="/users",    # 所有路由前缀为 /users
    tags=["users"]      # 在文档中分组显示
)
```

### 路由注册流程

```
1. users/router.py 定义路由
   ↓
2. users/__init__.py 导出 router
   ↓
3. main.py 导入并注册 router
   ↓
4. FastAPI 自动生成 API 文档和路由
```

### 实际的 URL 映射

```python
# router.py 中定义
@router.post("/register")  # 路径是 /register

# main.py 中注册
app.include_router(users_router, prefix="/users")

# 最终的 URL
POST /users/register
```

---

## 🌊 完整的请求流程

以用户注册为例：

```
1. 客户端发送请求
   POST /users/register
   {
     "username": "alice",
     "email": "alice@example.com",
     "password": "secret123"
   }
   ↓
2. FastAPI 路由匹配
   找到 router.py 中的 register_user 函数
   ↓
3. 请求验证
   使用 UserCreate schema 验证请求数据
   ↓
4. 依赖注入
   调用 get_session() 获取数据库会话
   ↓
5. 业务逻辑
   调用 crud.create_user() 创建用户
   ↓
6. 数据库操作
   crud.py 中执行 SQL 插入
   ↓
7. 响应序列化
   使用 UserResponse schema 序列化响应
   ↓
8. 返回给客户端
   {
     "id": 1,
     "username": "alice",
     "email": "alice@example.com",
     "is_active": true
   }
```

---

## 📋 API 接口列表

### 公开接口（不需要登录）

- `POST /users/register` - 注册新用户
- `POST /users/login` - 用户登录

### 需要登录的接口

- `GET /users/me` - 获取当前用户信息
- `PUT /users/me` - 更新当前用户信息
- `DELETE /users/me` - 删除当前用户账号

### 管理员接口（需要超级用户权限）

- `GET /users/` - 获取用户列表
- `GET /users/{user_id}` - 获取指定用户信息
- `PUT /users/{user_id}` - 更新指定用户信息
- `DELETE /users/{user_id}` - 删除指定用户

---

## 🚀 如何添加新模块

假设要添加 `posts` 模块：

```bash
app/posts/
├── __init__.py
├── model.py          # Post 数据库模型
├── schema.py         # PostCreate, PostResponse
├── crud.py           # create_post, get_posts, ...
├── router.py         # @router.post("/"), @router.get("/")
└── dependencies.py   # get_current_post, ...
```

然后在 `main.py` 中注册：

```python
from app.posts.router import router as posts_router

app.include_router(posts_router, prefix="/posts", tags=["posts"])
```

---

## 💡 最佳实践

1. **分层清晰**

   - `model.py`: 只关心数据库结构
   - `schema.py`: 只关心 API 输入输出
   - `crud.py`: 只关心数据库操作
   - `router.py`: 只关心路由和业务逻辑

2. **依赖注入**

   - 使用 `Depends` 注入数据库会话
   - 使用 `Depends` 注入当前用户
   - 便于测试和维护

3. **类型提示**

   - 所有函数都使用类型提示
   - 便于 IDE 自动补全和类型检查

4. **文档注释**

   - 每个函数都有 docstring
   - FastAPI 会自动生成 API 文档

5. **错误处理**
   - 使用 `HTTPException` 返回错误
   - 统一的错误格式

---

## 📖 相关资源

- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [SQLModel 官方文档](https://sqlmodel.tiangolo.com/)
- [Pydantic 官方文档](https://docs.pydantic.dev/)
