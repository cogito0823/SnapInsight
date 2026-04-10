from __future__ import annotations

from typing import Any, Protocol

from app.schemas.model_schema import ModelListResponse, ModelSummary


class ModelCatalogClient(Protocol):
    async def list_models(self) -> list[dict[str, Any]]: ...


class ModelCatalogService:
    def __init__(self, ollama_client: ModelCatalogClient) -> None:
        self._ollama_client = ollama_client

    async def list_models(self) -> ModelListResponse:
        upstream_models = await self._ollama_client.list_models()

        models = [
            ModelSummary(
                id=model["name"],
                label=model["name"],
                provider="ollama",
                available=True,
            )
            for model in upstream_models
            if isinstance(model.get("name"), str) and model["name"].strip()
        ]

        if not models:
            return ModelListResponse(
                state="no_models_available",
                models=[],
            )

        return ModelListResponse(
            state="ready",
            models=models,
        )
