# 密码哈希与验证完全指南

## 📚 目录

1. [为什么需要密码哈希？](#为什么需要密码哈希)
2. [什么是盐值（Salt）？](#什么是盐值salt)
3. [bcrypt 工作原理](#bcrypt-工作原理)
4. [为什么每次哈希结果都不同？](#为什么每次哈希结果都不同)
5. [在 Web 项目中的使用](#在-web-项目中的使用)
6. [完整示例代码](#完整示例代码)
7. [常见问题解答](#常见问题解答)

---

## 🔐 为什么需要密码哈希？

### ❌ 错误做法：明文存储密码

```python
# 数据库中存储明文密码（极度危险！）
user.password = "123456"  # ❌ 永远不要这样做！
```

**问题**：

1. 数据库泄露 → 所有密码泄露
2. 数据库管理员可以看到所有密码
3. 日志文件可能记录密码
4. 备份文件包含明文密码

**真实案例**：

- 2019 年，Facebook 存储了数亿用户的明文密码
- 2013 年，Adobe 泄露了 1.5 亿用户的密码

---

### ✅ 正确做法：哈希存储密码

```python
# 数据库中存储哈希值
user.hashed_password = "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
```

**优点**：

1. ✅ 数据库泄露 → 攻击者无法直接获取密码
2. ✅ 数据库管理员看不到明文密码
3. ✅ 日志文件不包含明文密码
4. ✅ 即使哈希值泄露，也很难破解

---

## 🧂 什么是盐值（Salt）？

### 定义

**盐值是一个随机生成的字符串，在哈希密码之前添加到密码中。**

```python
# 伪代码
hash = bcrypt(password + random_salt)
```

---

### 为什么需要盐值？

#### 问题：彩虹表攻击（Rainbow Table Attack）

**彩虹表**：预先计算好的密码 → 哈希值对照表

```
密码      → 哈希值（SHA256，无盐值）
123456   → 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
password → 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
qwerty   → 65e84be33532fb784c48129675f9eff3a682b27168c0ea744b2cf58ee02337c5
```

#### ❌ 没有盐值的情况

```python
import hashlib

# 两个用户使用相同密码
password1 = "123456"
password2 = "123456"

# 使用简单的 SHA256（没有盐值）
hash1 = hashlib.sha256(password1.encode()).hexdigest()
hash2 = hashlib.sha256(password2.encode()).hexdigest()

print(hash1)  # 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
print(hash2)  # 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
# ❌ 完全相同！攻击者可以：
# 1. 预先计算常见密码的哈希值
# 2. 查表就能破解密码
# 3. 一次破解，所有使用相同密码的用户都被破解
```

#### ✅ 有盐值的情况（bcrypt）

```python
import bcrypt

# 两个用户使用相同密码
password1 = "123456"
password2 = "123456"

# 每次生成不同的盐值
salt1 = bcrypt.gensalt()
salt2 = bcrypt.gensalt()

hash1 = bcrypt.hashpw(password1.encode(), salt1)
hash2 = bcrypt.hashpw(password2.encode(), salt2)

print(hash1.decode())
# $2b$12$abcdefghijklmnopqrstuOXYZ123456789...
print(hash2.decode())
# $2b$12$zyxwvutsrqponmlkjihgfeDCBA987654321...
# ✅ 完全不同！即使密码相同
# ✅ 攻击者无法预先计算
# ✅ 需要针对每个用户单独破解
```

---

### 盐值的三大作用

#### 1. 防止彩虹表攻击

```python
# 没有盐值
攻击者：查表 "123456" → 找到哈希值 → 破解成功 ✅

# 有盐值
攻击者：查表 "123456" → 找不到匹配的哈希值 → 破解失败 ❌
```

#### 2. 防止批量破解

```python
# 假设数据库泄露，有 100 万个用户

# 没有盐值
攻击者：破解一次 "123456" → 所有使用 "123456" 的用户都被破解

# 有盐值
攻击者：需要针对每个用户单独破解 → 成本增加 100 万倍
```

#### 3. 隐藏密码模式

```python
# 没有盐值
user1: password="123456" → hash="abc..."
user2: password="123456" → hash="abc..."  # 相同！
# 攻击者知道这两个用户使用相同密码

# 有盐值
user1: password="123456" → hash="abc..."
user2: password="123456" → hash="xyz..."  # 不同！
# 攻击者无法知道两个用户是否使用相同密码
```

---

## 🔬 bcrypt 工作原理

### bcrypt 哈希值的结构

```
$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
│  │  │                      │
│  │  │                      └─ 哈希值（31 字符）
│  │  └─ 盐值（22 字符）
│  └─ 成本因子（12 = 2^12 = 4096 轮）
└─ 版本标识（$2b$ = bcrypt）
```

### 详细分解

```python
import bcrypt

password = "123456"
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(password.encode(), salt)

print(hashed.decode())
# $2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

# 分解：
# $2b$        - 版本标识（bcrypt 版本）
# 12          - 成本因子（2^12 = 4096 轮哈希）
# N9qo8uLO... - 盐值（22 字符，Base64 编码）
# IjZAgcfl... - 哈希值（31 字符，Base64 编码）
```

### 关键特性

1. **盐值包含在哈希值中**

   - 无需单独存储盐值
   - 验证时自动提取盐值

2. **成本因子可调**

   - 成本因子越高，计算越慢
   - 可以随着硬件性能提升而增加

3. **自适应哈希函数**
   - 计算成本可调
   - 抗暴力破解

---

## 🎲 为什么每次哈希结果都不同？

### 核心原因：每次生成不同的随机盐值

```python
import bcrypt

password = "123456"

# 第 1 次哈希
hash1 = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
print(hash1.decode())
# $2b$12$abc123...xyz789

# 第 2 次哈希
hash2 = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
print(hash2.decode())
# $2b$12$def456...uvw012

# 第 3 次哈希
hash3 = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
print(hash3.decode())
# $2b$12$ghi789...rst345

# ✅ 每次都不同，因为盐值不同
```

### 验证过程

```python
# 1. 存储密码（注册时）
password = "123456"
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
# $2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
# 存储到数据库

# 2. 验证密码（登录时）
input_password = "123456"
stored_hash = hashed

# bcrypt.checkpw 内部流程：
# a. 从 stored_hash 中提取盐值
#    提取: "N9qo8uLOickgx2ZMRZoMye"
#
# b. 使用相同盐值对 input_password 进行哈希
#    计算: bcrypt.hashpw(input_password, extracted_salt)
#
# c. 比较两个哈希值
#    computed_hash == stored_hash
#
# d. 返回结果
#    True（密码正确）或 False（密码错误）

is_valid = bcrypt.checkpw(input_password.encode(), stored_hash)
print(is_valid)  # True
```

### 关键点

- ✅ **相同密码 + 不同盐值 = 不同哈希**
- ✅ **相同密码 + 相同盐值 = 相同哈希**
- ✅ **盐值包含在哈希值中**
- ✅ **验证时自动提取盐值**

---

## 🌐 在 Web 项目中的使用

### 调用时机总结

| 场景         | `get_password_hash()` | `verify_password()`        |
| ------------ | --------------------- | -------------------------- |
| **用户注册** | ✅ 调用 1 次          | ❌ 不调用                  |
| **用户登录** | ❌ 不调用             | ✅ 调用 1 次               |
| **修改密码** | ✅ 调用 1 次          | ✅ 调用 1 次（验证旧密码） |
| **重置密码** | ✅ 调用 1 次          | ❌ 不调用                  |

---

### 1️⃣ 用户注册流程

```python
# ========================================
# 用户注册
# ========================================
@router.post("/register")
async def register(user_in: UserCreate, session: AsyncSession = Depends(get_async_session)):
    # 1. 用户输入明文密码
    plain_password = user_in.password  # "123456"

    # 2. 【调用 get_password_hash】生成哈希密码
    hashed_password = get_password_hash(plain_password)
    # 结果: $2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

    # 3. 存储到数据库
    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password  # ✅ 存储哈希值，不是明文
    )
    session.add(user)
    await session.commit()

    return user
```

**数据库中的内容**：

```sql
SELECT id, username, hashed_password FROM users WHERE username = 'alice';

-- 结果：
-- id | username | hashed_password
-- 1  | alice    | $2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
--                  ↑ 这个值永远不变（除非修改密码）
```

---

### 2️⃣ 用户登录流程

```python
# ========================================
# 用户登录
# ========================================
@router.post("/login")
async def login(user_in: UserLogin, session: AsyncSession = Depends(get_async_session)):
    # 1. 用户输入明文密码
    input_password = user_in.password  # "123456"

    # 2. 从数据库查询用户
    user = await get_user_by_username(session, user_in.username)
    # user.hashed_password = "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

    # 3. 【调用 verify_password】验证密码
    is_valid = verify_password(input_password, user.hashed_password)

    if not is_valid:
        raise HTTPException(status_code=401, detail="密码错误")

    # 4. 生成 JWT token
    token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(hours=24)
    )

    return {"access_token": token, "token_type": "bearer"}
```

**关键点**：

- ❌ **登录时不调用 `get_password_hash()`**
- ✅ **登录时只调用 `verify_password()`**
- ✅ **数据库中的哈希值永远不变**

---

### 3️⃣ 修改密码流程

```python
# ========================================
# 修改密码
# ========================================
@router.put("/me/password")
async def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    # 1. 【调用 verify_password】验证旧密码
    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="旧密码错误")

    # 2. 【调用 get_password_hash】生成新的哈希
    new_hashed_password = get_password_hash(new_password)
    # 新的哈希值: $2b$12$xyz789...（与之前完全不同）

    # 3. 更新数据库
    current_user.hashed_password = new_hashed_password
    await session.commit()

    return {"message": "密码修改成功"}
```

---

### 📈 完整时间线示例

假设用户 Alice 的密码是 `"123456"`：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2025-12-01 10:00:00 - 用户注册
  ↓
  调用: get_password_hash("123456")
  生成: $2b$12$abc123...xyz789
  存储到数据库
  ✅ 第 1 次调用 get_password_hash

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2025-12-01 10:05:00 - 用户登录
  ↓
  调用: verify_password("123456", "$2b$12$abc123...xyz789")
  返回: True
  ❌ 不调用 get_password_hash

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2025-12-01 11:30:00 - 用户登录
  ↓
  调用: verify_password("123456", "$2b$12$abc123...xyz789")
  返回: True
  ❌ 不调用 get_password_hash

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2025-12-02 14:20:00 - 用户登录
  ↓
  调用: verify_password("123456", "$2b$12$abc123...xyz789")
  返回: True
  ❌ 不调用 get_password_hash

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2025-12-05 09:00:00 - 用户修改密码
  ↓
  调用: verify_password("123456", "$2b$12$abc123...xyz789")  # 验证旧密码
  调用: get_password_hash("new_password_789")
  生成: $2b$12$def456...uvw012（新的哈希值）
  更新数据库
  ✅ 第 2 次调用 get_password_hash

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2025-12-05 09:10:00 - 用户登录（使用新密码）
  ↓
  调用: verify_password("new_password_789", "$2b$12$def456...uvw012")
  返回: True
  ❌ 不调用 get_password_hash

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 💻 完整示例代码

### 1. 安全模块（`app/core/security.py`）

```python
"""
安全模块：密码哈希和 JWT 令牌管理
"""

import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from app.core.config import settings

# ========================================
# 配置
# ========================================
BCRYPT_ROUNDS = 12  # 成本因子（2^12 = 4096 轮）
ALGORITHM = "HS256"  # JWT 签名算法

# ========================================
# 密码哈希函数
# ========================================

def get_password_hash(password: str) -> str:
    """
    生成密码哈希

    Args:
        password: 明文密码

    Returns:
        bcrypt 哈希字符串

    示例:
        >>> hash = get_password_hash("123456")
        >>> print(hash)
        $2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
    """
    # 将密码转换为字节
    password_bytes = password.encode("utf-8")

    # 生成盐值并哈希密码
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password_bytes, salt)

    # 返回字符串格式
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码

    Args:
        plain_password: 明文密码
        hashed_password: 哈希密码

    Returns:
        密码匹配返回 True，否则返回 False

    示例:
        >>> hashed = get_password_hash("123456")
        >>> verify_password("123456", hashed)
        True
        >>> verify_password("wrong", hashed)
        False
    """
    # 将字符串转换为字节
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")

    # bcrypt.checkpw 内部使用时间恒定比较
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# ========================================
# JWT 令牌函数
# ========================================

def create_access_token(subject: str, expires_delta: timedelta) -> str:
    """
    创建 JWT 访问令牌

    Args:
        subject: 令牌主体（通常是用户 ID）
        expires_delta: 令牌有效期

    Returns:
        JWT 令牌字符串

    示例:
        >>> token = create_access_token(
        ...     subject="123",
        ...     expires_delta=timedelta(hours=24)
        ... )
    """
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"exp": expire, "sub": str(subject)}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
```

---

### 2. CRUD 操作（`app/users/crud.py`）

```python
"""
用户 CRUD 操作
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.users.model import User
from app.users.schema import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password


async def create_user(session: AsyncSession, user_in: UserCreate) -> User:
    """
    创建用户

    【调用 get_password_hash】
    """
    # 生成哈希密码（只调用一次）
    hashed_password = get_password_hash(user_in.password)

    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return user


async def authenticate_user(
    session: AsyncSession,
    username: str,
    password: str
) -> Optional[User]:
    """
    验证用户（用于登录）

    【调用 verify_password，不调用 get_password_hash】
    """
    # 查询用户
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        return None

    # 验证密码（不生成新哈希）
    if not verify_password(password, user.hashed_password):
        return None

    return user


async def update_password(
    session: AsyncSession,
    user_id: int,
    old_password: str,
    new_password: str
) -> bool:
    """
    修改密码

    【调用 verify_password 和 get_password_hash】
    """
    user = await session.get(User, user_id)
    if not user:
        return False

    # 验证旧密码
    if not verify_password(old_password, user.hashed_password):
        return False

    # 生成新的哈希密码（再次调用）
    user.hashed_password = get_password_hash(new_password)

    await session.commit()
    return True
```

---

### 3. API 路由（`app/users/router.py`）

```python
"""
用户 API 路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from app.core.db import get_async_session
from app.core.security import create_access_token
from app.users import crud
from app.users.schema import UserCreate, UserLogin, UserResponse

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    session: AsyncSession = Depends(get_async_session)
):
    """
    用户注册

    【调用 get_password_hash】
    """
    # 检查用户名是否已存在
    existing_user = await crud.get_user_by_username(session, user_in.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # 创建用户（内部调用 get_password_hash）
    user = await crud.create_user(session, user_in)
    return user


@router.post("/login")
async def login(
    user_in: UserLogin,
    session: AsyncSession = Depends(get_async_session)
):
    """
    用户登录

    【调用 verify_password，不调用 get_password_hash】
    """
    # 验证用户（内部调用 verify_password）
    user = await crud.authenticate_user(session, user_in.username, user_in.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 生成 JWT token
    token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(hours=24)
    )

    return {"access_token": token, "token_type": "bearer"}


@router.put("/me/password")
async def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    修改密码

    【调用 verify_password 和 get_password_hash】
    """
    success = await crud.update_password(
        session,
        current_user.id,
        old_password,
        new_password
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Old password is incorrect"
        )

    return {"message": "Password changed successfully"}
```

---

## ❓ 常见问题解答

### Q1: 为什么每次哈希结果都不同？

**A**: 因为每次都生成了不同的随机盐值。这是 bcrypt 的核心安全特性，用于防止彩虹表攻击。

```python
password = "123456"
hash1 = get_password_hash(password)  # $2b$12$abc...
hash2 = get_password_hash(password)  # $2b$12$xyz...
# 不同，因为盐值不同
```

---

### Q2: 盐值存储在哪里？

**A**: 盐值包含在哈希值中，无需单独存储。

```python
hashed = "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
#                └─────────────┬─────────────┘
#                            盐值（22 字符）
```

---

### Q3: 如何验证密码？

**A**: bcrypt 会从哈希值中提取盐值，使用相同盐值对输入密码进行哈希，然后比较结果。

```python
# 验证过程
is_valid = verify_password("123456", stored_hash)

# 内部流程：
# 1. 从 stored_hash 提取盐值
# 2. 使用相同盐值对 "123456" 哈希
# 3. 比较两个哈希值
# 4. 返回 True 或 False
```

---

### Q4: 成本因子是什么？

**A**: 成本因子决定哈希计算的轮数（2^成本因子）。值越高，计算越慢，安全性越高。

```python
BCRYPT_ROUNDS = 12  # 2^12 = 4096 轮

# 成本因子对比：
# 10 → 2^10 = 1024 轮   → 约 50ms
# 12 → 2^12 = 4096 轮   → 约 150ms（推荐）
# 14 → 2^14 = 16384 轮  → 约 600ms
```

---

### Q5: 登录时会重新哈希密码吗？

**A**: 不会！登录时只调用 `verify_password()`，不调用 `get_password_hash()`。

```python
# 注册时（调用 get_password_hash）
hashed = get_password_hash("123456")
# 存储: $2b$12$abc123...

# 登录时（只调用 verify_password）
is_valid = verify_password("123456", "$2b$12$abc123...")
# 不会生成新哈希
```

---

### Q6: 数据库中的哈希值会变吗？

**A**: 不会！除非用户修改密码，否则哈希值永远不变。

```python
# 注册时生成
2025-12-01: hashed = "$2b$12$abc123..."

# 登录 100 次，哈希值不变
2025-12-02: hashed = "$2b$12$abc123..."  # 相同
2025-12-03: hashed = "$2b$12$abc123..."  # 相同

# 修改密码后才会变
2025-12-05: hashed = "$2b$12$xyz789..."  # 新的哈希值
```

---

### Q7: bcrypt 安全吗？

**A**: 非常安全！bcrypt 在 2025 年仍然是推荐的密码哈希算法。

**优点**：

- ✅ 自适应哈希函数（成本因子可调）
- ✅ 内置盐值生成
- ✅ 抗暴力破解
- ✅ 经过时间验证（1999 年发布）

**替代方案**：

- Argon2（2015 年密码哈希竞赛冠军，更安全但更复杂）
- scrypt（也很安全，但不如 bcrypt 流行）

---

### Q8: 如何提高安全性？

**A**: 可以通过以下方式提高安全性：

1. **增加成本因子**

   ```python
   BCRYPT_ROUNDS = 14  # 更慢，更安全
   ```

2. **使用强密码策略**

   ```python
   # 要求密码至少 8 个字符，包含大小写字母、数字、特殊字符
   password: str = Field(min_length=8, pattern=r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])")
   ```

3. **实施账号锁定**

   ```python
   # 5 次登录失败后锁定账号 30 分钟
   if user.failed_login_attempts >= 5:
       raise HTTPException(status_code=423, detail="Account locked")
   ```

4. **使用 HTTPS**

   - 防止密码在传输过程中被窃取

5. **实施双因素认证（2FA）**
   - 即使密码泄露，攻击者也无法登录

---

## 🎯 总结

### 核心概念

1. **密码哈希**：将明文密码转换为不可逆的哈希值
2. **盐值**：随机字符串，防止彩虹表攻击
3. **bcrypt**：安全的密码哈希算法，内置盐值生成
4. **成本因子**：控制哈希计算轮数，可调节安全性

### 最佳实践

1. ✅ **永远不要存储明文密码**
2. ✅ **使用 bcrypt 或 Argon2**
3. ✅ **成本因子设置为 12-14**
4. ✅ **注册时调用 `get_password_hash()`**
5. ✅ **登录时调用 `verify_password()`**
6. ✅ **使用 HTTPS 传输密码**
7. ✅ **实施强密码策略**
8. ✅ **考虑双因素认证**

### 安全性保证

- ✅ 数据库泄露 → 密码仍然安全
- ✅ 彩虹表攻击 → 无效
- ✅ 批量破解 → 成本极高
- ✅ 密码模式 → 无法识别

**记住：安全性永远是第一位的！** 🔐

---

## 📚 延伸阅读

- [bcrypt 官方文档](https://github.com/pyca/bcrypt/)
- [OWASP 密码存储指南](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Argon2 vs bcrypt](https://security.stackexchange.com/questions/193351/argon2-vs-bcrypt)
- [密码哈希竞赛](https://www.password-hashing.net/)
