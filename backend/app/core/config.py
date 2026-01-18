import os
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    应用配置 - 简化版

    核心思想：直接使用 DATABASE_URL，避免解析 URL 组件的复杂性

    优点：
    1. 配置简洁：只需要一个 DATABASE_URL
    2. 无需解析：避免 Pydantic v2 的 PostgresDsn API 变更问题
    3. 驱动切换：通过简单的字符串替换实现同步/异步切换
    4. 环境隔离：
       - .env      → Docker 容器内（db:5432）
       - .env.test → 宿主机开发（localhost:5432 或 5433）
    """

    # 环境配置
    environment: Literal["local", "production", "test", "development"] = "local"

    # 安全配置
    SECRET_KEY: str = Field(
        default="changethis-please-use-openssl-rand-hex-32", description="JWT 签名密钥"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60 * 24 * 7, description="访问令牌过期时间（分钟）"
    )  # 7 天

    # ==========================================
    # API 配置
    # ==========================================
    API_VERSION: str = Field(default="v1", description="API 版本")
    API_PREFIX: str = Field(default="/api/v1", description="API 路径前缀")

    # 数据库 URL（必须提供）
    # 格式：postgresql://user:password@host:port/database
    database_url: str = Field(..., description="完整的数据库连接 URL")
    database_echo: bool = Field(default=False, description="是否显示SQL日志")

    # 以下字段仅用于 docker-compose 初始化数据库（可选）
    postgres_user: str = ""
    postgres_password: str = ""
    postgres_db: str = ""
    postgres_server: str = ""
    postgres_port: int = 5432

    # ==========================================
    # 初始化数据配置（默认超级管理员）
    # ==========================================
    FIRST_SUPERUSER: str = Field(default="admin", description="默认超级管理员用户名")
    FIRST_SUPERUSER_PASSWORD: str = Field(
        default="123456", description="默认超级管理员密码"
    )
    FIRST_SUPERUSER_EMAIL: str = Field(
        default="admin@example.com", description="默认超级管理员邮箱"
    )

    # ==========================================
    # GitOps 内容配置
    # ==========================================
    CONTENT_DIR: str = Field(default="/content", description="Git 内容仓库根目录")
    GIT_AUTO_CREATE_CATEGORIES: bool = Field(
        default=True, description="是否自动创建分类"
    )
    GIT_STRICT_STRUCTURE: bool = Field(
        default=False, description="是否强制目录结构（不允许平铺）"
    )
    GIT_DEFAULT_CATEGORY: str = Field(
        default="uncategorized", description="默认分类别名"
    )
    WEBHOOK_SECRET: str = Field(default="", description="GitHub Webhook Secret")

    # ==========================================
    # Next.js 缓存失效配置
    # ==========================================
    FRONTEND_URL: str = Field(
        default="http://localhost:3000", description="前端 Next.js 应用的 URL"
    )
    REVALIDATE_SECRET: str = Field(
        default="changethis-please-use-openssl-rand-hex-32",
        description="Next.js 缓存失效 API 的密钥",
    )

    # ==========================================
    # 媒体文件配置
    # ==========================================
    MEDIA_ROOT: str = Field(default="media", description="媒体文件存储根目录")
    MEDIA_URL: str = Field(
        default="http://localhost:8000/media/", description="媒体文件访问URL前缀"
    )
    BASE_URL: str = Field(default="http://localhost:8000", description="项目基础URL")

    # ==========================================
    # 监控配置（APM）
    # ==========================================
    sentry_dsn: str = Field(default="", description="Sentry DSN（留空则不启用）")
    sentry_environment: str = Field(
        default="development", description="Sentry 环境标识"
    )
    sentry_traces_sample_rate: float = Field(
        default=0.1, description="Sentry 追踪采样率"
    )
    enable_opentelemetry: bool = Field(
        default=False, description="是否启用 OpenTelemetry"
    )
    otel_exporter_endpoint: str = Field(
        default="http://localhost:4317", description="OpenTelemetry 导出端点"
    )
    slow_request_threshold: float = Field(default=1.0, description="慢请求阈值（秒）")

    # ==========================================
    # APM 监控配置
    # ==========================================
    # Sentry 配置
    sentry_dsn: str = Field(default="", description="Sentry DSN（留空则不启用）")
    sentry_environment: str = Field(
        default="development", description="Sentry 环境标识"
    )
    sentry_traces_sample_rate: float = Field(
        default=0.1, description="Sentry 性能追踪采样率（0.0-1.0）"
    )

    # OpenTelemetry 配置
    enable_opentelemetry: bool = Field(
        default=False, description="是否启用 OpenTelemetry"
    )
    otel_exporter_endpoint: str = Field(
        default="http://localhost:4317", description="OTLP Exporter 端点"
    )

    # 性能监控配置
    slow_request_threshold: float = Field(default=1.0, description="慢请求阈值（秒）")

    model_config = SettingsConfigDict(
        # 优先级：.env.local（本地开发）> .env.test（测试）> .env（Docker）
        env_file=(
            "../.env.test"
            if os.getenv("ENVIRONMENT") == "test"
            else ("../.env.local" if os.path.exists("../.env.local") else "../.env")
        ),
        env_ignore_empty=True,
        extra="ignore",
    )

    @property
    def sync_database_url(self) -> str:
        """
        同步数据库 URL（使用 psycopg 驱动）

        用于：SQLModel/SQLAlchemy 同步操作、Jupyter Notebook
        """
        url = self.database_url
        # postgresql:// → postgresql+psycopg://
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        # postgresql+asyncpg:// → postgresql+psycopg://
        if "+asyncpg" in url:
            return url.replace("+asyncpg", "+psycopg")
        return url

    @property
    def async_database_url(self) -> str:
        """
        异步数据库 URL（使用 asyncpg 驱动）

        用于：FastAPI 异步接口、Alembic 异步迁移
        """
        url = self.database_url
        # postgresql:// → postgresql+asyncpg://
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        # postgresql+psycopg:// → postgresql+asyncpg://
        if "+psycopg" in url:
            return url.replace("+psycopg", "+asyncpg")
        return url

    # ==========================================
    # 兼容旧代码的别名
    # ==========================================
    @property
    def postgres_url(self) -> str:
        """同步 URL 别名（兼容旧代码）"""
        return self.sync_database_url

    @property
    def async_postgres_url(self) -> str:
        """异步 URL 别名（兼容旧代码）"""
        return self.async_database_url


settings = Settings()  # type: ignore
