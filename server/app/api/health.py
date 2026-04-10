from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
async def get_health(request: Request):
    return await request.app.state.health_service.get_health()
