from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.errors import UnexpectedServiceError, UpstreamUnavailableError
from app.main import create_app


class FakeOllamaClient:
    def __init__(self, *, models=None, reachable=True, model_error: Exception | None = None) -> None:
        self._models = models if models is not None else []
        self._reachable = reachable
        self._model_error = model_error

    async def check_reachable(self) -> bool:
        return self._reachable

    async def list_models(self):
        if self._model_error is not None:
            raise self._model_error
        return self._models


class HealthAndModelsRouteTests(unittest.TestCase):
    trusted_origin = "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

    def make_client(self, fake_client: FakeOllamaClient) -> TestClient:
        settings = Settings(
            trusted_extension_id="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        )
        app = create_app(settings=settings)
        app.state.health_service._ollama_probe = fake_client
        app.state.model_catalog_service._ollama_client = fake_client
        return TestClient(app)

    def allowed_origin_headers(self) -> dict[str, str]:
        return {
            "Origin": self.trusted_origin,
        }

    def test_health_returns_service_identity(self) -> None:
        client = self.make_client(
            FakeOllamaClient(
                reachable=True,
                models=[{"name": "llama3.1:8b"}],
            )
        )

        response = client.get("/health", headers=self.allowed_origin_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "status": "ok",
                "service": "snapinsight-local-api",
                "version": "v1",
                "ollamaReachable": True,
            },
        )

    def test_health_reports_ollama_unreachable_without_failing_route(self) -> None:
        client = self.make_client(FakeOllamaClient(reachable=False))

        response = client.get("/health", headers=self.allowed_origin_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["ollamaReachable"], False)

    def test_health_rejects_missing_origin(self) -> None:
        client = self.make_client(FakeOllamaClient(reachable=True))

        response = client.get("/health")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json(),
            {
                "error": {
                    "code": "request_failed",
                    "message": "The request origin is not allowed.",
                    "retryable": False,
                }
            },
        )

    def test_health_rejects_untrusted_origin(self) -> None:
        client = self.make_client(FakeOllamaClient(reachable=True))

        response = client.get(
            "/health",
            headers={"Origin": "chrome-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"]["code"], "request_failed")

    def test_models_returns_ready_state(self) -> None:
        client = self.make_client(
            FakeOllamaClient(
                models=[{"name": "llama3.1:8b"}, {"name": "qwen2.5:7b"}],
            )
        )

        response = client.get("/v1/models", headers=self.allowed_origin_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "state": "ready",
                "models": [
                    {
                        "id": "llama3.1:8b",
                        "label": "llama3.1:8b",
                        "provider": "ollama",
                        "available": True,
                    },
                    {
                        "id": "qwen2.5:7b",
                        "label": "qwen2.5:7b",
                        "provider": "ollama",
                        "available": True,
                    },
                ],
            },
        )

    def test_models_returns_no_models_available_state(self) -> None:
        client = self.make_client(FakeOllamaClient(models=[]))

        response = client.get("/v1/models", headers=self.allowed_origin_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "state": "no_models_available",
                "models": [],
            },
        )

    def test_models_maps_upstream_unavailable_to_503(self) -> None:
        client = self.make_client(
            FakeOllamaClient(model_error=UpstreamUnavailableError("down"))
        )

        response = client.get("/v1/models", headers=self.allowed_origin_headers())

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json(),
            {
                "error": {
                    "code": "request_failed",
                    "message": "Model list could not be loaded.",
                    "retryable": True,
                }
            },
        )

    def test_models_maps_unexpected_failure_to_500(self) -> None:
        client = self.make_client(
            FakeOllamaClient(model_error=UnexpectedServiceError("bad payload"))
        )

        response = client.get("/v1/models", headers=self.allowed_origin_headers())

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["error"]["code"], "request_failed")

    def test_models_reject_missing_origin(self) -> None:
        client = self.make_client(FakeOllamaClient(models=[]))

        response = client.get("/v1/models")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json(),
            {
                "error": {
                    "code": "request_failed",
                    "message": "The request origin is not allowed.",
                    "retryable": False,
                }
            },
        )

    def test_models_reject_untrusted_origin(self) -> None:
        client = self.make_client(FakeOllamaClient(models=[]))

        response = client.get(
            "/v1/models",
            headers={"Origin": "chrome-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"]["code"], "request_failed")


if __name__ == "__main__":
    unittest.main()
