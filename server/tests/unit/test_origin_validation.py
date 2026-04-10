from __future__ import annotations

import unittest

from app.core.config import Settings
from app.core.errors import OriginNotAllowedError
from app.core.origin_validation import ensure_allowed_origin


class OriginValidationTests(unittest.TestCase):
    def test_accepts_configured_extension_id_origin(self) -> None:
        settings = Settings(
            trusted_extension_id="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        )

        ensure_allowed_origin(
            "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            settings,
        )

    def test_rejects_missing_origin(self) -> None:
        settings = Settings(
            trusted_extension_id="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        )

        with self.assertRaises(OriginNotAllowedError):
            ensure_allowed_origin(None, settings)

    def test_requires_explicit_trusted_extension_configuration(self) -> None:
        with self.assertRaises(ValueError):
            Settings()


if __name__ == "__main__":
    unittest.main()
