from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.ollama_client import OllamaClient
from app.api.explanations import router as explanations_router
from app.api.health import router as health_router
from app.api.models import router as models_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.services.health_service import HealthService
from app.services.model_catalog_service import ModelCatalogService


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()
    configure_logging(app_settings.debug_logging)

    app = FastAPI(
        title="SnapInsight Local API",
        version=app_settings.api_version,
        docs_url="/docs",
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[app_settings.resolved_trusted_extension_origin],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    ollama_client = OllamaClient(
        base_url=app_settings.ollama_base_url,
        timeout_seconds=app_settings.ollama_timeout_seconds,
    )
    app.state.settings = app_settings
    app.state.health_service = HealthService(
        service_name=app_settings.service_name,
        version=app_settings.api_version,
        ollama_probe=ollama_client,
    )
    app.state.model_catalog_service = ModelCatalogService(ollama_client)

    app.include_router(health_router)
    app.include_router(models_router)
    app.include_router(explanations_router)
    return app


def run() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:create_app",
        host=settings.host,
        port=settings.port,
        factory=True,
        reload=False,
    )
