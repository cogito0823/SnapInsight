from __future__ import annotations

import json

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import ValidationError

from app.core.errors import (
    ExtensionIdentityNotAllowedError,
    SelectedModelUnavailableError,
    UnexpectedServiceError,
    UpstreamUnavailableError,
    create_forbidden_request_error,
    create_invalid_request_error,
    create_request_failed_error,
    create_selected_model_unavailable_error,
)
from app.core.origin_validation import (
    EXTENSION_ID_HEADER,
    ensure_allowed_extension_identity,
)
from app.schemas.error_schema import build_error_response
from app.schemas.explanation_schema import ExplanationRequest
from app.schemas.stream_event_schema import encode_stream_event

router = APIRouter(prefix="/v1", tags=["explanations"])


@router.post("/explanations/stream")
async def post_explanations_stream(request: Request):
    try:
        ensure_allowed_extension_identity(
            request.headers.get("origin"),
            request.headers.get(EXTENSION_ID_HEADER),
            request.app.state.settings,
        )
        raw_payload = await request.json()
        payload = ExplanationRequest.model_validate(raw_payload)
    except ExtensionIdentityNotAllowedError:
        error = create_forbidden_request_error()
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=build_error_response(error).model_dump(),
        )
    except (json.JSONDecodeError, ValidationError, ValueError):
        error = create_invalid_request_error()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=build_error_response(error).model_dump(),
        )

    service = request.app.state.explanation_service

    try:
        session = await service.start_explanation(payload)
    except SelectedModelUnavailableError:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=build_error_response(
                create_selected_model_unavailable_error()
            ).model_dump(),
        )
    except UpstreamUnavailableError:
        error = create_request_failed_error("Explanation stream could not be started.")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=build_error_response(error).model_dump(),
        )
    except UnexpectedServiceError:
        error = create_request_failed_error("Explanation stream could not be started.")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=build_error_response(error).model_dump(),
        )

    async def stream_response():
        async for event in service.stream_events(session):
            yield encode_stream_event(event)

    return StreamingResponse(
        stream_response(),
        media_type="application/x-ndjson",
    )
