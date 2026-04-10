from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PublicError:
    code: str
    message: str
    retryable: bool


class SnapInsightError(Exception):
    pass


class UpstreamUnavailableError(SnapInsightError):
    pass


class UnexpectedServiceError(SnapInsightError):
    pass


class InvalidRequestError(SnapInsightError):
    pass


class OriginNotAllowedError(SnapInsightError):
    pass


class SelectedModelUnavailableError(SnapInsightError):
    pass


def create_request_failed_error(message: str) -> PublicError:
    return PublicError(
        code="request_failed",
        message=message,
        retryable=True,
    )


def create_forbidden_request_error(message: str = "The request origin is not allowed.") -> PublicError:
    return PublicError(
        code="request_failed",
        message=message,
        retryable=False,
    )


def create_invalid_request_error(message: str = "Request payload is invalid.") -> PublicError:
    return PublicError(
        code="invalid_request",
        message=message,
        retryable=False,
    )


def create_selected_model_unavailable_error(
    message: str = "A valid model must be selected before explanation can start.",
) -> PublicError:
    return PublicError(
        code="selected_model_unavailable",
        message=message,
        retryable=False,
    )
