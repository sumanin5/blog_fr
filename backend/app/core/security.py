"""
安全模块 (Security Module)
==========================

本模块提供了 FastAPI 应用程序的核心安全功能，包括：
1. 密码哈希和验证
2. JWT 访问令牌的生成和管理
3. 基于 bcrypt 的密码加密

主要组件：
- 密码上下文管理器：使用 bcrypt 算法进行密码哈希
- JWT 令牌生成：创建带有过期时间的访问令牌
- 密码验证：验证明文密码与哈希密码是否匹配

使用场景：
- 用户注册时的密码哈希
- 用户登录时的密码验证
- 生成用户认证的 JWT 令牌
- API 接口的身份验证

安全特性：
- 使用 bcrypt 算法，具有自适应性和抗彩虹表攻击
- JWT 令牌包含过期时间，提高安全性
- 使用 HS256 算法签名，确保令牌完整性
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from app.core.config import settings

# =============================================================================
# 密码配置 (Password Configuration)
# =============================================================================

# bcrypt 成本因子（工作因子）
# 值越高，哈希计算越慢，安全性越高，但性能开销也越大
# 推荐值：12（默认），生产环境可考虑 12-14
BCRYPT_ROUNDS = 12

# =============================================================================
# JWT 配置 (JWT Configuration)
# =============================================================================

# JWT 签名算法
# HS256: HMAC with SHA-256，对称加密算法
# 使用共享密钥进行签名和验证
ALGORITHM = "HS256"

# =============================================================================
# 令牌管理函数 (Token Management Functions)
# =============================================================================


def create_access_token(subject: str | Any, expires_delta: timedelta) -> str:
    """
    创建 JWT 访问令牌

    功能说明：
    生成一个包含用户标识和过期时间的 JWT 令牌，用于 API 身份验证。

    参数：
    - subject: 令牌主体，通常是用户 ID 或用户名
    - expires_delta: 令牌有效期时长

    返回：
    - str: 编码后的 JWT 令牌字符串

    工作原理：
    1. 计算令牌过期时间（当前时间 + 有效期）
    2. 构建 JWT 载荷（包含过期时间和主体）
    3. 使用应用密钥和 HS256 算法签名
    4. 返回编码后的令牌字符串

    使用示例：
    ```python
    from datetime import timedelta
    token = create_access_token(
        subject="user123",
        expires_delta=timedelta(hours=24)
    )
    ```

    安全注意事项：
    - 令牌包含过期时间，防止长期有效的令牌被滥用
    - 使用应用配置中的 SECRET_KEY 进行签名
    - 令牌一旦生成无法撤销，只能等待过期
    """
    # 计算令牌过期时间（UTC 时区）
    expire = datetime.now(timezone.utc) + expires_delta

    # 构建 JWT 载荷
    # exp: 过期时间（标准 JWT 声明）
    # sub: 主体标识（标准 JWT 声明）
    to_encode = {"exp": expire, "sub": str(subject)}

    # 使用密钥和算法对载荷进行编码签名
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# =============================================================================
# 密码管理函数 (Password Management Functions)
# =============================================================================


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证明文密码与哈希密码是否匹配

    功能说明：
    使用 bcrypt 算法验证用户输入的明文密码是否与存储的哈希密码匹配。

    参数：
    - plain_password: 用户输入的明文密码
    - hashed_password: 数据库中存储的哈希密码

    返回：
    - bool: 密码匹配返回 True，否则返回 False

    工作原理：
    1. bcrypt 从哈希密码中提取盐值和成本参数
    2. 使用相同的盐值和参数对明文密码进行哈希
    3. 比较两个哈希值是否相同

    使用示例：
    ```python
    # 用户登录验证
    if verify_password(user_input_password, stored_hash):
        print("密码正确")
    else:
        print("密码错误")
    ```

    安全特性：
    - 时间恒定比较，防止时序攻击
    - 每次验证都会重新计算哈希，确保安全性
    - bcrypt 的自适应特性使暴力破解变得困难
    """
    # 将字符串转换为字节
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")

    # bcrypt.checkpw 内部使用时间恒定比较
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    """
    生成密码的哈希值

    功能说明：
    使用 bcrypt 算法将明文密码转换为安全的哈希值，用于数据库存储。

    参数：
    - password: 需要哈希的明文密码

    返回：
    - str: bcrypt 哈希后的密码字符串

    工作原理：
    1. bcrypt 自动生成随机盐值
    2. 使用盐值和密码生成哈希
    3. 将盐值、成本参数和哈希值组合成最终字符串

    使用示例：
    ```python
    # 用户注册时哈希密码
    hashed_password = get_password_hash("user_password123")
    # 存储到数据库
    user.hashed_password = hashed_password
    ```

    哈希格式：
    bcrypt 哈希格式：$2b$12$salt_and_hash
    - $2b$: bcrypt 版本标识
    - 12: 成本参数（2^12 = 4096 轮）
    - 后续: 盐值和哈希值的 base64 编码

    安全特性：
    - 每次调用都会生成不同的哈希值（因为盐值不同）
    - 成本参数可调，可以随着硬件性能提升而增加
    - 即使相同密码，哈希值也不同，防止彩虹表攻击
    """
    # 将密码转换为字节
    password_bytes = password.encode("utf-8")

    # 生成盐值并哈希密码
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password_bytes, salt)

    # 返回字符串格式
    return hashed.decode("utf-8")
