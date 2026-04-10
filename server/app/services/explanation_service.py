from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncIterator, Protocol

from app.core.errors import (
    PublicError,
    SelectedModelUnavailableError,
    UnexpectedServiceError,
    UpstreamUnavailableError,
    create_request_failed_error,
)
from app.schemas.error_schema import ErrorResponseBody
from app.schemas.explanation_schema import ExplanationRequest
from app.schemas.stream_event_schema import (
    ChunkStreamEvent,
    CompleteStreamEvent,
    ErrorStreamEvent,
    StartStreamEvent,
)


class ExplanationModelClient(Protocol):
    async def list_models(self) -> list[dict[str, object]]: ...

    def stream_generate(self, *, model: str, prompt: str) -> AsyncIterator[str]: ...


@dataclass(frozen=True)
class ExplanationStreamSession:
    request_id: str
    mode: str
    model: str
    upstream_stream: AsyncIterator[str]


class ExplanationService:
    def __init__(self, ollama_client: ExplanationModelClient) -> None:
        self._ollama_client = ollama_client

    async def start_explanation(
        self, request: ExplanationRequest
    ) -> ExplanationStreamSession:
        available_models = await self._ollama_client.list_models()
        requested_model = request.model.strip()

        is_available = any(
            isinstance(model.get("name"), str) and model["name"].strip() == requested_model
            for model in available_models
        )
        if not is_available:
            raise SelectedModelUnavailableError("The selected model is no longer available.")

        return ExplanationStreamSession(
            request_id=request.requestId,
            mode=request.mode,
            model=requested_model,
            upstream_stream=self._ollama_client.stream_generate(
                model=requested_model,
                prompt=self._build_prompt(request.text, request.mode),
            ),
        )

    async def stream_events(
        self, session: ExplanationStreamSession
    ) -> AsyncIterator[StartStreamEvent | ChunkStreamEvent | CompleteStreamEvent | ErrorStreamEvent]:
        yield StartStreamEvent(
            requestId=session.request_id,
            mode=session.mode,
            model=session.model,
        )

        try:
            async for delta in session.upstream_stream:
                if not delta:
                    continue

                yield ChunkStreamEvent(
                    requestId=session.request_id,
                    delta=delta,
                )
        except (UpstreamUnavailableError, UnexpectedServiceError):
            yield self._build_error_event(
                session.request_id,
                create_request_failed_error("Explanation generation failed."),
            )
            return
        except Exception:
            yield self._build_error_event(
                session.request_id,
                create_request_failed_error("Explanation generation failed."),
            )
            return

        yield CompleteStreamEvent(requestId=session.request_id)

    def _build_prompt(self, text: str, mode: str) -> str:
        if mode == "short":
            return (
                "请用中文优先解释用户选中的概念，保持简洁直观，"
                "尽量控制在120字以内，必要时保留原文术语。\n\n"
                f"待解释文本：{text}"
            )

        return (
            "请用中文优先提供更完整的解释，优先覆盖定义、背景、使用场景和示例，"
            "必要时保留原文术语。\n\n"
            f"待解释文本：{text}"
        )

    def _build_error_event(self, request_id: str, error: PublicError) -> ErrorStreamEvent:
        return ErrorStreamEvent(
            requestId=request_id,
            error=ErrorResponseBody(
                code=error.code,
                message=error.message,
                retryable=error.retryable,
            ),
        )
