from __future__ import annotations

from typing import Protocol

from app.schemas.health_schema import HealthResponse


class HealthProbe(Protocol):
    async def check_reachable(self) -> bool: ...


class HealthService:
    def __init__(self, service_name: str, version: str, ollama_probe: HealthProbe) -> None:
        self._service_name = service_name
        self._version = version
        self._ollama_probe = ollama_probe

    async def get_health(self) -> HealthResponse:
        ollama_reachable = await self._ollama_probe.check_reachable()
        return HealthResponse(
            status="ok",
            service=self._service_name,
            version=self._version,
            ollamaReachable=ollama_reachable,
        )
