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
        # 环境变量加载顺序 (优先级从低到高，后加载覆盖先加载)：
        # 1. ../.env       (根目录 Docker 基础配置)
        # 2. .env          (后端目录独立配置)
        # 3. ../.env.local (根目录本地覆盖)
        env_file=[
            f
            for f in [
                ".env",
                ".env.local",
                ".env.test" if os.getenv("ENVIRONMENT") == "test" else None,
            ]
            if f is not None
        ],
        env_ignore_empty=True,
        extra="ignore",
    )


# 实例化单例
settings = Settings()  # type: ignore
