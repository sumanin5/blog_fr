from pydantic import Field


class SecuritySettings:
    """安全与认证配置项"""

    SECRET_KEY: str = Field(
        default="changethis-please-use-openssl-rand-hex-32", description="JWT 签名密钥"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60 * 24 * 7, description="访问令牌过期时间（分钟）"
    )  # 7 天

    # 初始化数据配置（默认超级管理员）
    FIRST_SUPERUSER: str = Field(default="admin", description="默认超级管理员用户名")
    FIRST_SUPERUSER_PASSWORD: str = Field(
        default="123456", description="默认超级管理员密码"
    )
    FIRST_SUPERUSER_EMAIL: str = Field(
        default="admin@example.com", description="默认超级管理员邮箱"
    )
