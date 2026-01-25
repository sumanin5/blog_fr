import os

from pydantic_settings import BaseSettings, SettingsConfigDict

from .base import BaseAppSettings
from .database import DatabaseSettings
from .external import ExternalIntegrationSettings
from .git_ops import GitOpsSettings
from .media import MediaSettings
from .monitoring import MonitoringSettings
from .security import SecuritySettings


class Settings(
    BaseSettings,
    BaseAppSettings,
    SecuritySettings,
    DatabaseSettings,
    MonitoringSettings,
    GitOpsSettings,
    ExternalIntegrationSettings,
    MediaSettings,
):
    """
    统一配置类 - 通过多重继承聚合各模块配置

    优势：
    1. 模块化管理：不同业务的配置存放在不同文件
    2. 无缝平替：外部调用依然是 settings.xxx，无需修改代码
    3. 清理冗余：删除了原文件中重复定义的监控项
    """

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


# 实例化单例
settings = Settings()  # type: ignore
