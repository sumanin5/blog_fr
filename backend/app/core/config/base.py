from typing import Literal

from pydantic import Field


class BaseAppSettings:
    """基础应用配置项"""

    # 环境配置
    environment: Literal["local", "production", "test", "development"] = "local"

    # API 配置
    API_VERSION: str = Field(default="v1", description="API 版本")
    API_PREFIX: str = Field(default="/api/v1", description="API 路径前缀")
    BASE_URL: str = Field(default="http://localhost:8000", description="项目基础URL")
