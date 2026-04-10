from __future__ import annotations

from pydantic import BaseModel

from app.core.errors import PublicError


class ErrorResponseBody(BaseModel):
    code: str
    message: str
    retryable: bool


class ErrorResponse(BaseModel):
    error: ErrorResponseBody


def build_error_response(error: PublicError) -> ErrorResponse:
    return ErrorResponse(
        error=ErrorResponseBody(
            code=error.code,
            message=error.message,
            retryable=error.retryable,
        )
    )
