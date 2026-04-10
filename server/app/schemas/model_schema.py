from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class ModelSummary(BaseModel):
    id: str
    label: str
    provider: Literal["ollama"] = "ollama"
    available: bool = True


class ModelListResponse(BaseModel):
    state: Literal["ready", "no_models_available"]
    models: list[ModelSummary]
