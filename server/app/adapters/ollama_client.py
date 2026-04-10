from __future__ import annotations

import json
from typing import Any, AsyncIterator

import httpx

from app.core.errors import UnexpectedServiceError, UpstreamUnavailableError


class OllamaClient:
    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    async def check_reachable(self) -> bool:
        try:
            await self.list_models()
            return True
        except (UpstreamUnavailableError, UnexpectedServiceError):
            return False

    async def list_models(self) -> list[dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.get(f"{self._base_url}/api/tags")
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise UpstreamUnavailableError("Timed out while querying Ollama.") from exc
        except httpx.RequestError as exc:
            raise UpstreamUnavailableError("Could not reach Ollama.") from exc
        except httpx.HTTPStatusError as exc:
            raise UnexpectedServiceError("Ollama returned an unexpected status.") from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise UnexpectedServiceError("Ollama returned invalid JSON.") from exc

        models = payload.get("models")
        if not isinstance(models, list):
            raise UnexpectedServiceError("Ollama response did not include a models list.")

        return [model for model in models if isinstance(model, dict)]

    async def stream_generate(self, *, model: str, prompt: str) -> AsyncIterator[str]:
        timeout = httpx.Timeout(
            connect=self._timeout_seconds,
            write=self._timeout_seconds,
            read=None,
            pool=self._timeout_seconds,
        )

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self._base_url}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": True,
                    },
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line:
                            continue

                        try:
                            payload = json.loads(line)
                        except ValueError as exc:
                            raise UnexpectedServiceError(
                                "Ollama returned invalid streaming JSON."
                            ) from exc

                        if not isinstance(payload, dict):
                            raise UnexpectedServiceError(
                                "Ollama returned an invalid streaming event."
                            )

                        chunk = payload.get("response")
                        if chunk is not None and not isinstance(chunk, str):
                            raise UnexpectedServiceError(
                                "Ollama returned an invalid response chunk."
                            )

                        if isinstance(chunk, str) and chunk:
                            yield chunk

                        if payload.get("done") is True:
                            break
        except httpx.TimeoutException as exc:
            raise UpstreamUnavailableError("Timed out while generating the explanation.") from exc
        except httpx.RequestError as exc:
            raise UpstreamUnavailableError("Could not reach Ollama.") from exc
        except httpx.HTTPStatusError as exc:
            raise UnexpectedServiceError("Ollama returned an unexpected status.") from exc
