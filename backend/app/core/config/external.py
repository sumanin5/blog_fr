from pydantic import Field


class ExternalIntegrationSettings:
    """外部服务对接配置项 (如前端 Revalidate)"""

    FRONTEND_URL: str = Field(
        default="http://localhost:3000", description="前端 Next.js 应用的 URL"
    )
    REVALIDATE_SECRET: str = Field(
        default="changethis-please-use-openssl-rand-hex-32",
        description="Next.js 缓存失效 API 的密钥",
    )
