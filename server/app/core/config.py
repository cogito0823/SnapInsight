from __future__ import annotations

from functools import lru_cache
from urllib.parse import urlparse

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="SNAPINSIGHT_",
        extra="ignore",
    )

    host: str = "127.0.0.1"
    port: int = 11435
    service_name: str = "snapinsight-local-api"
    api_version: str = "v1"
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_timeout_seconds: float = 5.0
    trusted_extension_origin: str | None = Field(default=None)
    trusted_extension_id: str | None = Field(default=None)
    debug_logging: bool = False

    @model_validator(mode="after")
    def validate_trusted_extension(self) -> "Settings":
        origin = self.trusted_extension_origin
        extension_id = self.trusted_extension_id

        if origin is None and extension_id is None:
            raise ValueError(
                "Either SNAPINSIGHT_TRUSTED_EXTENSION_ORIGIN or "
                "SNAPINSIGHT_TRUSTED_EXTENSION_ID must be configured."
            )

        if origin is not None:
            parsed = urlparse(origin)
            if parsed.scheme != "chrome-extension" or not parsed.netloc or parsed.path not in ("", "/"):
                raise ValueError(
                    "SNAPINSIGHT_TRUSTED_EXTENSION_ORIGIN must be a "
                    "chrome-extension://<extension-id> origin."
                )

        if extension_id is not None and not extension_id.islower():
            raise ValueError("SNAPINSIGHT_TRUSTED_EXTENSION_ID must be lowercase.")

        return self

    @property
    def resolved_trusted_extension_origin(self) -> str:
        if self.trusted_extension_origin is not None:
            return self.trusted_extension_origin.rstrip("/")

        assert self.trusted_extension_id is not None
        return f"chrome-extension://{self.trusted_extension_id}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
