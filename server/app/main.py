from fastapi import FastAPI

from app.api.explanations import router as explanations_router
from app.api.health import router as health_router
from app.api.models import router as models_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="SnapInsight Local API",
        version="v1",
        docs_url="/docs",
        redoc_url=None,
    )
    app.include_router(health_router)
    app.include_router(models_router)
    app.include_router(explanations_router)
    return app


app = create_app()


def run() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=11435, reload=False)
