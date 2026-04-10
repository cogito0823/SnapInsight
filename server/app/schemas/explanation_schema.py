from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, field_validator

MAX_EXPLANATION_TEXT_LENGTH = 200


class ExplanationRequest(BaseModel):
    requestId: str
    text: str
    model: str
    mode: Literal["short", "detailed"]

    @field_validator("requestId", "model")
    @classmethod
    def validate_non_empty_string(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Field must be a non-empty string.")

        return normalized

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Text must be a non-empty string.")

        if len(normalized) > MAX_EXPLANATION_TEXT_LENGTH:
            raise ValueError("Text exceeds the defensive API ceiling.")

        return normalized
