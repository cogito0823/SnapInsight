from __future__ import annotations

import unittest

from app.core.config import Settings
from app.core.errors import ExtensionIdentityNotAllowedError
from app.core.origin_validation import ensure_allowed_extension_identity


class OriginValidationTests(unittest.TestCase):
    def test_accepts_configured_extension_id_origin(self) -> None:
        settings = Settings(
            trusted_extension_id="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        )

        ensure_allowed_extension_identity(
            "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            None,
            settings,
        )

    def test_accepts_matching_extension_id_header_without_origin(self) -> None:
        settings = Settings(
            trusted_extension_id="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        )

        ensure_allowed_extension_identity(
            None,
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            settings,
        )

    def test_rejects_missing_identity_signals(self) -> None:
        settings = Settings(
            trusted_extension_id="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        )

        with self.assertRaises(ExtensionIdentityNotAllowedError):
            ensure_allowed_extension_identity(None, None, settings)

    def test_requires_explicit_trusted_extension_configuration(self) -> None:
        with self.assertRaises(ValueError):
            Settings()


if __name__ == "__main__":
    unittest.main()
