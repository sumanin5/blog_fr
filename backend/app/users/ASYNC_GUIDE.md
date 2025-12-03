# 异步 vs 同步数据库操作

## 📊 主要变化

### 1. 数据库会话

#### 同步版本（旧）

```python
from sqlmodel import Session
from app.core.db import get_session

def get_user(session: Session = Depends(get_session)):
    user = session.get(User, 1)
    return user
```

#### 异步版本（新）✅

```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session

async def get_user(session: AsyncSession = Depends(get_async_session)):
    user = await session.get(User, 1)
    return user
```

---

### 2. CRUD 操作

#### 同步版本（旧）

```python
def create_user(session: Session, user_in: UserCreate) -> User:
    user = User(**user_in.model_dump())
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
```

#### 异步版本（新）✅

```python
async def create_user(session: AsyncSession, user_in: UserCreate) -> User:
    user = User(**user_in.model_dump())
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user
```

---

### 3. 查询操作

#### 同步版本（旧）

```python
from sqlmodel import select

def get_users(session: Session) -> list[User]:
    stmt = select(User)
    users = session.exec(stmt).all()
    return users
```

#### 异步版本（新）✅

```python
from sqlalchemy import select

async def get_users(session: AsyncSession) -> list[User]:
    stmt = select(User)
    result = await session.execute(stmt)
    users = result.scalars().all()
    return list(users)
```

---

### 4. 路由函数

#### 同步版本（旧）

```python
@router.post("/users")
def create_user_endpoint(
    user_in: UserCreate,
    session: Session = Depends(get_session)
):
    return crud.create_user(session, user_in)
```

#### 异步版本（新）✅

```python
@router.post("/users")
async def create_user_endpoint(
    user_in: UserCreate,
    session: AsyncSession = Depends(get_async_session)
):
    return await crud.create_user(session, user_in)
```

---

## 🔑 关键点

### 需要 `await` 的操作

```python
# ✅ 需要 await
await session.get(User, 1)
await session.execute(stmt)
await session.commit()
await session.refresh(user)
await session.delete(user)

# ✅ 需要 await（CRUD 函数）
await crud.create_user(session, user_in)
await crud.get_user_by_id(session, 1)
await crud.update_user(session, 1, user_in)
await crud.delete_user(session, 1)
```

### 不需要 `await` 的操作

```python
# ❌ 不需要 await
session.add(user)
stmt = select(User)
result.scalars().all()
user_in.model_dump()
```

---

## 🚀 为什么使用异步？

### 优点

1. **更高的并发性能**

   - 同步：每个请求阻塞一个线程
   - 异步：单线程处理多个请求

2. **更好的资源利用**

   - 等待数据库响应时，可以处理其他请求
   - 减少线程切换开销

3. **FastAPI 推荐**
   - FastAPI 原生支持异步
   - 与 `async/await` 语法完美配合

### 性能对比

```
同步版本：
请求1 → [等待数据库] → 响应1
请求2 →                   [等待数据库] → 响应2
请求3 →                                   [等待数据库] → 响应3

异步版本：
请求1 → [等待数据库] → 响应1
请求2 → [等待数据库] → 响应2
请求3 → [等待数据库] → 响应3
        ↑ 同时进行
```

---

## 📝 迁移检查清单

- [x] `db.py`: 使用 `create_async_engine` 和 `AsyncSession`
- [x] `crud.py`: 所有函数改为 `async def`，数据库操作加 `await`
- [x] `dependencies.py`: 依赖项改为 `async def`
- [x] `router.py`: 路由函数改为 `async def`，调用 CRUD 时加 `await`

---

## ⚠️ 常见错误

### 1. 忘记 `await`

```python
# ❌ 错误
async def get_user(session: AsyncSession):
    user = session.get(User, 1)  # 返回 coroutine，不是 User
    return user

# ✅ 正确
async def get_user(session: AsyncSession):
    user = await session.get(User, 1)
    return user
```

### 2. 在同步函数中使用 `await`

```python
# ❌ 错误
def get_user(session: AsyncSession):  # 不是 async def
    user = await session.get(User, 1)  # SyntaxError
    return user

# ✅ 正确
async def get_user(session: AsyncSession):
    user = await session.get(User, 1)
    return user
```

### 3. 混用同步和异步会话

```python
# ❌ 错误
from sqlmodel import Session  # 同步会话

async def get_user(session: Session):  # 类型不匹配
    user = await session.get(User, 1)  # Session 没有 await
    return user

# ✅ 正确
from sqlalchemy.ext.asyncio import AsyncSession

async def get_user(session: AsyncSession):
    user = await session.get(User, 1)
    return user
```

---

## 🔧 何时使用同步会话？

虽然异步是推荐的，但在以下场景仍可使用同步会话：

1. **Jupyter Notebook / 脚本**

   ```python
   from app.core.db import sync_engine
   from sqlmodel import Session

   with Session(sync_engine) as session:
       user = session.get(User, 1)
       print(user)
   ```

2. **测试**

   ```python
   def test_create_user():
       with Session(sync_engine) as session:
           user = create_user_sync(session, user_in)
           assert user.id is not None
   ```

3. **数据迁移脚本**
   ```python
   def migrate_data():
       with Session(sync_engine) as session:
           # 批量数据处理
           ...
   ```

---

## 📚 相关资源

- [SQLAlchemy 异步文档](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [FastAPI 异步数据库](https://fastapi.tiangolo.com/advanced/async-sql-databases/)
- [Python asyncio 文档](https://docs.python.org/3/library/asyncio.html)
