from __future__ import annotations

import json
import unittest
from dataclasses import dataclass
from typing import AsyncIterator

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.errors import (
    SelectedModelUnavailableError,
    UpstreamUnavailableError,
)
from app.main import create_app
from app.schemas.error_schema import ErrorResponseBody
from app.schemas.stream_event_schema import (
    ChunkStreamEvent,
    CompleteStreamEvent,
    ErrorStreamEvent,
    StartStreamEvent,
)


@dataclass
class FakeSession:
    request_id: str
    mode: str
    model: str


class FakeExplanationService:
    def __init__(self, *, startup_error: Exception | None = None, events=None) -> None:
        self._startup_error = startup_error
        self._events = list(events or [])
        self.received_request = None

    async def start_explanation(self, request):
        if self._startup_error is not None:
            raise self._startup_error

        self.received_request = request
        return FakeSession(
            request_id=request.requestId,
            mode=request.mode,
            model=request.model,
        )

    async def stream_events(self, _session: FakeSession) -> AsyncIterator[object]:
        for event in self._events:
            yield event


class ExplanationStreamRouteTests(unittest.TestCase):
    trusted_origin = "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

    def make_client(self, service: FakeExplanationService) -> TestClient:
        settings = Settings(
            trusted_extension_id="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        )
        app = create_app(settings=settings)
        app.state.explanation_service = service
        return TestClient(app)

    def allowed_origin_headers(self) -> dict[str, str]:
        return {
            "Origin": self.trusted_origin,
            "Content-Type": "application/json",
        }

    def test_stream_route_returns_ndjson_events_in_order(self) -> None:
        service = FakeExplanationService(
            events=[
                StartStreamEvent(
                    requestId="req-1",
                    mode="short",
                    model="llama3.1:8b",
                ),
                ChunkStreamEvent(
                    requestId="req-1",
                    delta="这是一个",
                ),
                ChunkStreamEvent(
                    requestId="req-1",
                    delta="简短解释。",
                ),
                CompleteStreamEvent(requestId="req-1"),
            ]
        )
        client = self.make_client(service)

        response = client.post(
            "/v1/explanations/stream",
            headers=self.allowed_origin_headers(),
            json={
                "requestId": "req-1",
                "text": "Transformer",
                "model": "llama3.1:8b",
                "mode": "short",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            response.headers["content-type"].startswith("application/x-ndjson")
        )
        self.assertEqual(
            [json.loads(line)["event"] for line in response.text.strip().splitlines()],
            ["start", "chunk", "chunk", "complete"],
        )
        self.assertEqual(service.received_request.text, "Transformer")

    def test_stream_route_maps_selected_model_unavailable_before_stream(self) -> None:
        client = self.make_client(
            FakeExplanationService(
                startup_error=SelectedModelUnavailableError("missing"),
            )
        )

        response = client.post(
            "/v1/explanations/stream",
            headers=self.allowed_origin_headers(),
            json={
                "requestId": "req-2",
                "text": "Transformer",
                "model": "missing:model",
                "mode": "short",
            },
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.json(),
            {
                "error": {
                    "code": "selected_model_unavailable",
                    "message": "A valid model must be selected before explanation can start.",
                    "retryable": False,
                }
            },
        )

    def test_stream_route_maps_upstream_unavailable_before_stream(self) -> None:
        client = self.make_client(
            FakeExplanationService(
                startup_error=UpstreamUnavailableError("ollama down"),
            )
        )

        response = client.post(
            "/v1/explanations/stream",
            headers=self.allowed_origin_headers(),
            json={
                "requestId": "req-3",
                "text": "Transformer",
                "model": "llama3.1:8b",
                "mode": "short",
            },
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "request_failed")

    def test_stream_route_rejects_invalid_payload_with_400(self) -> None:
        client = self.make_client(FakeExplanationService())

        response = client.post(
            "/v1/explanations/stream",
            headers=self.allowed_origin_headers(),
            json={
                "requestId": "",
                "text": "   ",
                "model": "llama3.1:8b",
                "mode": "short",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "invalid_request")

    def test_stream_route_rejects_missing_origin_before_stream(self) -> None:
        client = self.make_client(FakeExplanationService())

        response = client.post(
            "/v1/explanations/stream",
            json={
                "requestId": "req-4",
                "text": "Transformer",
                "model": "llama3.1:8b",
                "mode": "short",
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"]["code"], "request_failed")

    def test_stream_route_keeps_post_start_failures_inside_stream(self) -> None:
        client = self.make_client(
            FakeExplanationService(
                events=[
                    StartStreamEvent(
                        requestId="req-5",
                        mode="short",
                        model="llama3.1:8b",
                    ),
                    ErrorStreamEvent(
                        requestId="req-5",
                        error=ErrorResponseBody(
                            code="request_failed",
                            message="Explanation generation failed.",
                            retryable=True,
                        ),
                    ),
                ]
            )
        )

        response = client.post(
            "/v1/explanations/stream",
            headers=self.allowed_origin_headers(),
            json={
                "requestId": "req-5",
                "text": "Transformer",
                "model": "llama3.1:8b",
                "mode": "short",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [json.loads(line)["event"] for line in response.text.strip().splitlines()],
            ["start", "error"],
        )


if __name__ == "__main__":
    unittest.main()
