from urllib.parse import quote_plus

import pytest
from app.core.config import settings


@pytest.mark.unit
def test_postgres_url():
    expected_url = f"postgresql+psycopg://{settings.postgres_user}:{quote_plus(settings.postgres_password)}@{settings.postgres_server}:{settings.postgres_port}/{settings.postgres_db}"
    assert str(settings.postgres_url) == expected_url


@pytest.mark.unit
def test_async_postgres_url():
    expected_url = f"postgresql+asyncpg://{settings.postgres_user}:{quote_plus(settings.postgres_password)}@{settings.postgres_server}:{settings.postgres_port}/{settings.postgres_db}"
    assert str(settings.async_postgres_url) == expected_url
