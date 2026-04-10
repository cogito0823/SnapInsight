from __future__ import annotations

from dataclasses import dataclass

import httpx

from .config import CompanionConfig
from .process_manager import ManagedProcessSnapshot

TRUST_HEADER = "X-SnapInsight-Extension-Id"


@dataclass(frozen=True)
class CompanionStatusSnapshot:
    service_running: bool
    service_healthy: bool
    service_pid: int | None
    ollama_reachable: bool
    model_catalog_state: str
    model_count: int
    last_error: str | None


def _local_api_headers(config: CompanionConfig) -> dict[str, str]:
    if not config.trusted_extension_id:
        return {}

    return {TRUST_HEADER: config.trusted_extension_id}


def collect_status(
    config: CompanionConfig, process_snapshot: ManagedProcessSnapshot
) -> CompanionStatusSnapshot:
    last_error: str | None = None
    service_healthy = False
    ollama_reachable = False
    model_catalog_state = "unknown"
    model_count = 0

    if not config.trusted_extension_id:
        last_error = "Trusted extension id is not configured."
    else:
        try:
            with httpx.Client(timeout=2.0) as client:
                health_response = client.get(
                    f"http://{config.host}:{config.port}/health",
                    headers=_local_api_headers(config),
                )
                if health_response.is_success:
                    service_healthy = True
        except httpx.HTTPError as error:
            last_error = f"Local API health check failed: {error}"

    try:
        with httpx.Client(timeout=2.0) as client:
            ollama_response = client.get(f"{config.ollama_base_url}/api/tags")
            if ollama_response.is_success:
                ollama_reachable = True
    except httpx.HTTPError as error:
        if last_error is None:
            last_error = f"Ollama check failed: {error}"

    if service_healthy:
        try:
            with httpx.Client(timeout=2.0) as client:
                models_response = client.get(
                    f"http://{config.host}:{config.port}/v1/models",
                    headers=_local_api_headers(config),
                )
                if models_response.is_success:
                    payload = models_response.json()
                    model_catalog_state = str(payload.get("state", "unknown"))
                    model_count = len(payload.get("models", []))
        except httpx.HTTPError as error:
            if last_error is None:
                last_error = f"Model catalog check failed: {error}"

    return CompanionStatusSnapshot(
        service_running=process_snapshot.running,
        service_healthy=service_healthy,
        service_pid=process_snapshot.pid,
        ollama_reachable=ollama_reachable,
        model_catalog_state=model_catalog_state,
        model_count=model_count,
        last_error=last_error,
    )
