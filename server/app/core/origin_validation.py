from __future__ import annotations

from app.core.config import Settings
from app.core.errors import ExtensionIdentityNotAllowedError

EXTENSION_ID_HEADER = "X-SnapInsight-Extension-Id"

def ensure_allowed_extension_identity(
    origin: str | None,
    extension_id_header: str | None,
    settings: Settings,
) -> None:
    trusted_origin = settings.resolved_trusted_extension_origin
    trusted_extension_id = settings.resolved_trusted_extension_id
    header_value = extension_id_header.strip() if extension_id_header is not None else None

    if origin == trusted_origin or header_value == trusted_extension_id:
        return

    raise ExtensionIdentityNotAllowedError(
        "The request extension identity is not allowed."
    )
