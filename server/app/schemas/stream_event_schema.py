from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from app.schemas.error_schema import ErrorResponseBody


class StartStreamEvent(BaseModel):
    event: Literal["start"] = "start"
    requestId: str
    mode: Literal["short", "detailed"]
    model: str


class ChunkStreamEvent(BaseModel):
    event: Literal["chunk"] = "chunk"
    requestId: str
    delta: str


class CompleteStreamEvent(BaseModel):
    event: Literal["complete"] = "complete"
    requestId: str


class ErrorStreamEvent(BaseModel):
    event: Literal["error"] = "error"
    requestId: str
    error: ErrorResponseBody


def encode_stream_event(event: BaseModel) -> bytes:
    return f"{event.model_dump_json()}\n".encode("utf-8")
