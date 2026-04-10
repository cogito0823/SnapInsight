from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from starlette import status

from app.core.errors import (
    ExtensionIdentityNotAllowedError,
    create_forbidden_request_error,
)
from app.core.origin_validation import (
    EXTENSION_ID_HEADER,
    ensure_allowed_extension_identity,
)
from app.schemas.error_schema import build_error_response

router = APIRouter(tags=["health"])


@router.get("/health")
async def get_health(request: Request):
    try:
        ensure_allowed_extension_identity(
            request.headers.get("origin"),
            request.headers.get(EXTENSION_ID_HEADER),
            request.app.state.settings,
        )
    except ExtensionIdentityNotAllowedError:
        error = create_forbidden_request_error()
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=build_error_response(error).model_dump(),
        )

    return await request.app.state.health_service.get_health()
