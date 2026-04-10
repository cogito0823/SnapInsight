from __future__ import annotations

import unittest
from unittest.mock import patch

from app.adapters.ollama_client import OllamaClient


class FakeStreamResponse:
    def __init__(self, lines: list[str]) -> None:
        self._lines = lines
        self.status_code = 200

    async def __aenter__(self) -> "FakeStreamResponse":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None

    def raise_for_status(self) -> None:
        return None

    async def aiter_lines(self):
        for line in self._lines:
            yield line


class FakeAsyncClient:
    def __init__(self, *, timeout=None) -> None:
        self.timeout = timeout
        self.stream_calls: list[tuple[str, str, dict[str, object]]] = []

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None

    def stream(self, method: str, url: str, json: dict[str, object]) -> FakeStreamResponse:
        self.stream_calls.append((method, url, json))
        return FakeStreamResponse(
            [
                '{"model":"qwen3.5:0.8b","message":{"role":"assistant","content":"例子"},"done":false}',
                '{"model":"qwen3.5:0.8b","message":{"role":"assistant","content":"是说明用的样本。"},"done":false}',
                '{"model":"qwen3.5:0.8b","message":{"role":"assistant","content":""},"done":true}',
            ]
        )


class OllamaClientStreamingTests(unittest.IsolatedAsyncioTestCase):
    async def test_stream_generate_uses_chat_api_and_yields_message_content(self) -> None:
        fake_client = FakeAsyncClient()

        with patch(
            "app.adapters.ollama_client.httpx.AsyncClient",
            return_value=fake_client,
        ):
            client = OllamaClient("http://127.0.0.1:11434", 5.0)
            chunks: list[str] = []

            async for chunk in client.stream_generate(
                model="qwen3.5:0.8b",
                prompt="请用中文简短解释 Example",
            ):
                chunks.append(chunk)

        self.assertEqual(chunks, ["例子", "是说明用的样本。"])
        self.assertEqual(len(fake_client.stream_calls), 1)
        method, url, payload = fake_client.stream_calls[0]
        self.assertEqual(method, "POST")
        self.assertEqual(url, "http://127.0.0.1:11434/api/chat")
        self.assertEqual(payload["model"], "qwen3.5:0.8b")
        self.assertEqual(payload["stream"], True)
        self.assertEqual(payload["think"], False)
        self.assertEqual(
            payload["messages"],
            [{"role": "user", "content": "请用中文简短解释 Example"}],
        )


if __name__ == "__main__":
    unittest.main()
