---
name: backend-new-module
description: 后端新模块创建指南。定义了基于 Base 模型（基于sqlmodel）的分层架构 (Model, Schema, CRUD, Service, Router, Exceptions, Utils) 以及异常处理规范和注册流程。
---

# 后端新模块创建指南

## 📖 简介

本指南详细说明了在 `backend/app/` 目录下创建新业务模块的标准流程和代码规范。本项目采用了严格的分层架构（Router -> Service -> CRUD -> Model），以确保代码的可维护性和测试性。

## 🏗️ 目录结构

一个标准的模块目录（例如 `backend/app/new_module/`）应包含以下文件：

```
backend/app/new_module/
├── __init__.py
├── model.py          # SQLModel 数据库模型
├── schema.py         # Pydantic API 交互模型 (Req/Res)
├── crud.py           # 数据库原子操作
├── service.py        # 业务逻辑与权限检查
├── router.py         # API 路由定义
├── exceptions.py     # 模块自定义异常
├── utils.py          # (可选) 模块辅助工具函数
└── dependencies.py   # (可选) 模块特有的依赖注入
```

## 📝 详细规范

### 1. Model 层 (`model.py`)

定义数据库表结构。

- 必须继承自 `app.core.base.Base` 并设置 `table=True`（对于数据库表）。
- `Base` 类已通过 `uuid7` 自动定义了 `id` 主键，以及 `created_at` 和 `updated_at` 时间戳，无需重复定义。
- 只有多对多中间表才直接继承 `SQLModel`。
- 定义表之间的 `Relationship`。

```python
from uuid import UUID
from sqlmodel import Field, Relationship
from app.core.base import Base

class Item(Base, table=True):
    __tablename__ = "module_item" # 建议加上模块前缀防止冲突

    title: str = Field(index=True)
    owner_id: UUID = Field(foreign_key="user.id")

    # Relationships
    # owner: "User" = Relationship(...)
```

### 2. Schema 层 (`schema.py`)

定义 API 请求和响应的数据结构 (Pydantic)。

- 命名规范：`*Create`, `*Update`, `*Response`。
- `Response` 模型通常需要 `model_config = ConfigDict(from_attributes=True)` 以支持 ORM 对象转换。

```python
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class ItemBase(BaseModel):
    title: str

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    title: str | None = None

class ItemResponse(ItemBase):
    id: UUID
    owner_id: UUID

    model_config = ConfigDict(from_attributes=True)
```

### 3. CRUD 层 (`crud.py`)

只负责单一的数据库操作，**不包含业务逻辑**。

- 使用 `AsyncSession`。
- 常用操作：`get`, `create`, `update`, `delete`, `list`。
- 负责处理 `selectinload` 等预加载逻辑。

```python
from uuid import UUID
from typing import Sequence
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.new_module.model import Item

async def get_item(session: AsyncSession, item_id: UUID) -> Item | None:
    return await session.get(Item, item_id)

async def create_item(session: AsyncSession, item: Item) -> Item:
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item
```

### 4. Service 层 (`service.py`)

负责业务逻辑编排和**细粒度权限检查**。

- 调用 `crud` 层获取数据。
- 检查用户权限（如：是否是资源的所有者）。
- 抛出业务异常（如 `ItemNotFoundError`, `InsufficientPermissionsError`）。
- **⚠️ 重要规范**：由于项目已在 `core/exceptions.py` 和全局处理器中实现了统一的异常拦截，**Service 层和 Router 层应尽量避免使用 `try...except` 语句**。应当直接检查条件并 `raise` 自定义异常，让全局处理器负责向前端返回错误响应，保持业务代码纯净。

```python
from uuid import UUID
from sqlmodel.ext.asyncio.session import AsyncSession
from app.users.model import User
from app.core.exceptions import InsufficientPermissionsError
from app.new_module import crud, schema, model

async def update_item(
    session: AsyncSession,
    item_id: UUID,
    update_data: schema.ItemUpdate,
    current_user: User
) -> model.Item:
    item = await crud.get_item(session, item_id)
    if not item:
        raise exceptions.ItemNotFoundError()

    # 权限检查：只有所有者或超管可以修改
    if item.owner_id != current_user.id and not current_user.is_superadmin:
        raise InsufficientPermissionsError()

    # 更新逻辑...
    return await crud.update_item(session, item, update_data)
```

### 5. Router 层 (`router.py`)

负责 HTTP 请求处理和**粗粒度权限控制**。

- 使用 `APIRouter`。
- 利用 `Depends` 注入 `Session` 和 `User`。
- 处理 HTTP 状态码。

```python
from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_async_session
from app.users.dependencies import get_current_active_user
from app.users.model import User
from app.new_module import service, schema

router = APIRouter(prefix="/items", tags=["items"])

@router.patch("/{item_id}", response_model=schema.ItemResponse)
async def update_item(
    item_id: UUID,
    item_in: schema.ItemUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)]
):
    return await service.update_item(session, item_id, item_in, current_user)
```

### 6. 异常处理 (`exceptions.py`)

定义模块特有的业务异常。

- 必须继承自 `app.core.exceptions.BaseAppException`。
- 定义明确的 `error_code` 和 `status_code`。

```python
from app.core.exceptions import BaseAppException

class ItemNotFoundError(BaseAppException):
    def __init__(self, message: str = "Item not found"):
        super().__init__(
            message=message,
            status_code=404,
            error_code="ITEM_NOT_FOUND"
        )
```

### 7. 辅助工具 (`utils.py`)

存放模块内部通用的工具函数、数据转换逻辑等。

- 如果逻辑过于复杂，可以将 `utils.py` 升级为 `utils/` 目录。
- 典型的工具包括：Slug 生成、加密处理、复杂的数据计算等。

```python
import string
import random

def generate_random_code(length: int = 6) -> str:
    """生成随机字符串示例"""
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))
```

## 🚀 注册模块

创建完模块后，务必在 `backend/app/main.py` 中注册新的路由：

```python
# backend/app/main.py
from app.new_module.router import router as new_module_router

app.include_router(new_module_router, prefix=settings.API_PREFIX)
```

## ⚠️ 检查清单

- [ ] 是否添加了 `__init__.py`？
- [ ] Model 是否添加了 `table=True`？
- [ ] Service 层是否包含了权限检查？
- [ ] Router 是否正确使用了 `Depends(get_async_session)`？
- [ ] 是否在 `backend/pyproject.toml` 中添加了该模块的测试 Marker？
