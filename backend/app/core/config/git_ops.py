from pydantic import Field


class GitOpsSettings:
    """GitOps 同步功能相关的配置项"""

    CONTENT_DIR: str = Field(
        default="/git_root/content", description="Git 内容仓库根目录"
    )
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
