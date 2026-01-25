from pydantic import Field


class DatabaseSettings:
    """数据库相关配置项"""

    # 数据库 URL
    database_url: str = Field(..., description="完整的数据库连接 URL")
    database_echo: bool = Field(default=False, description="是否显示SQL日志")

    # 以下字段仅用于 docker-compose 初始化数据库（可选）
    postgres_user: str = ""
    postgres_password: str = ""
    postgres_db: str = ""
    postgres_server: str = ""
    postgres_port: int = 5432

    @property
    def sync_database_url(self) -> str:
        """同步数据库 URL（使用 psycopg 驱动）"""
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        if "+asyncpg" in url:
            return url.replace("+asyncpg", "+psycopg")
        return url

    @property
    def async_database_url(self) -> str:
        """异步数据库 URL（使用 asyncpg 驱动）"""
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if "+psycopg" in url:
            return url.replace("+psycopg", "+asyncpg")
        return url

    # 兼容旧代码的别名
    @property
    def postgres_url(self) -> str:
        return self.sync_database_url

    @property
    def async_postgres_url(self) -> str:
        return self.async_database_url
