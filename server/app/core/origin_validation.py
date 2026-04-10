from __future__ import annotations

from app.core.config import Settings
from app.core.errors import OriginNotAllowedError


def ensure_allowed_origin(origin: str | None, settings: Settings) -> None:
    if origin != settings.resolved_trusted_extension_origin:
        raise OriginNotAllowedError("The request origin is not allowed.")
