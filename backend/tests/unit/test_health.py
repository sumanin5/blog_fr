from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.core.health import readiness


@pytest.mark.asyncio
async def test_readiness_checks_database():
    session = AsyncMock()
    assert await readiness(session) == {"status": "ok"}
    session.execute.assert_awaited_once()
    assert str(session.execute.call_args.args[0]) == "SELECT 1"


@pytest.mark.asyncio
@pytest.mark.parametrize("failure", [RuntimeError("private connection detail"), TimeoutError()])
async def test_readiness_returns_unavailable_without_database_details(failure):
    session = AsyncMock()
    session.execute.side_effect = failure
    with pytest.raises(HTTPException) as error:
        await readiness(session)
    assert error.value.status_code == 503
    assert error.value.detail == "Database unavailable"
