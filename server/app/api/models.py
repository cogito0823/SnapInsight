from __future__ import annotations

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app.core.errors import (
    ExtensionIdentityNotAllowedError,
    UnexpectedServiceError,
    UpstreamUnavailableError,
    create_forbidden_request_error,
    create_request_failed_error,
)
from app.core.origin_validation import (
    EXTENSION_ID_HEADER,
    ensure_allowed_extension_identity,
)
from app.schemas.error_schema import build_error_response

router = APIRouter(prefix="/v1", tags=["models"])


@router.get("/models")
async def get_models(request: Request):
    service = request.app.state.model_catalog_service

    try:
        ensure_allowed_extension_identity(
            request.headers.get("origin"),
            request.headers.get(EXTENSION_ID_HEADER),
            request.app.state.settings,
        )
        return await service.list_models()
    except ExtensionIdentityNotAllowedError:
        error = create_forbidden_request_error()
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=build_error_response(error).model_dump(),
        )
    except UpstreamUnavailableError:
        error = create_request_failed_error("Model list could not be loaded.")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=build_error_response(error).model_dump(),
        )
    except UnexpectedServiceError:
        error = create_request_failed_error("Model list could not be loaded.")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=build_error_response(error).model_dump(),
        )
