import pytest
from app.core.config import settings


@pytest.mark.unit
def test_postgres_url():
    """测试同步数据库 URL 生成"""
    url = str(settings.postgres_url)
    assert "postgresql+psycopg://" in url

    # 如果设置了散装字段，验证它们是否体现在 URL 中
    if settings.postgres_server:
        assert settings.postgres_server in url
    if settings.postgres_db:
        assert settings.postgres_db in url


@pytest.mark.unit
def test_async_postgres_url():
    """测试异步数据库 URL 生成"""
    url = str(settings.async_postgres_url)
    assert "postgresql+asyncpg://" in url

    # 验证驱动是否正确替换
    assert "+asyncpg" in url
    assert "+psycopg" not in url
