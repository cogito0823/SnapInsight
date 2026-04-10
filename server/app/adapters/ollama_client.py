from __future__ import annotations

from typing import Any

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
