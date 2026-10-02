"""Readiness probes used by the production deployment."""

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session

router = APIRouter()


@router.get("/health/ready", include_in_schema=False)
async def readiness(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> dict[str, str]:
    try:
        await asyncio.wait_for(session.execute(text("SELECT 1")), timeout=4)
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable") from None
    return {"status": "ok"}
