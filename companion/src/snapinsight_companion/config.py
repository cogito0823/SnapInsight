from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

from .paths import (
    CompanionPaths,
    build_companion_paths,
    is_packaged_runtime,
    resolve_packaged_launcher_executable,
    resolve_default_server_source_dir,
)


@dataclass(frozen=True)
class CompanionConfig:
    host: str
    port: int
    ollama_base_url: str
    trusted_extension_id: str | None
    debug_logging: bool
    auto_start_service: bool
    launch_at_login: bool
    health_poll_interval_seconds: float
    launch_executable: str
    paths: CompanionPaths


DEFAULT_CONFIG: dict[str, object] = {
    "trusted_extension_id": "",
    "auto_start_service": True,
    "launch_at_login": False,
}


def read_config_payload(config_file: Path) -> dict[str, object]:
    if not config_file.exists():
        return {}

    return json.loads(config_file.read_text(encoding="utf-8"))


def write_config_payload(config_file: Path, payload: dict[str, object]) -> None:
    config_file.parent.mkdir(parents=True, exist_ok=True)
    config_file.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def update_config_payload(config_file: Path, **updates: object) -> dict[str, object]:
    payload = dict(DEFAULT_CONFIG)
    payload.update(read_config_payload(config_file))
    payload.update({key: value for key, value in updates.items() if value is not None})
    write_config_payload(config_file, payload)
    return payload


def load_config() -> CompanionConfig:
    server_source_dir = Path(
        os.environ.get("SNAPINSIGHT_SERVER_SOURCE_DIR", resolve_default_server_source_dir())
    )
    paths = build_companion_paths(server_source_dir=server_source_dir)
    file_config = read_config_payload(paths.config_file)

    trusted_extension_id = os.environ.get(
        "SNAPINSIGHT_TRUSTED_EXTENSION_ID",
        file_config.get("trusted_extension_id"),
    )
    if trusted_extension_id is not None:
        trusted_extension_id = str(trusted_extension_id).strip() or None

    launch_executable = (
        str(resolve_packaged_launcher_executable() or sys.executable)
        if is_packaged_runtime()
        else sys.executable
    )

    return CompanionConfig(
        host=str(file_config.get("host", os.environ.get("SNAPINSIGHT_HOST", "127.0.0.1"))),
        port=int(file_config.get("port", os.environ.get("SNAPINSIGHT_PORT", 11435))),
        ollama_base_url=str(
            file_config.get(
                "ollama_base_url",
                os.environ.get("SNAPINSIGHT_OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
            )
        ),
        trusted_extension_id=trusted_extension_id,
        debug_logging=str(
            file_config.get(
                "debug_logging",
                os.environ.get("SNAPINSIGHT_DEBUG_LOGGING", "false"),
            )
        ).lower()
        in {"1", "true", "yes", "on"},
        auto_start_service=str(
            file_config.get(
                "auto_start_service",
                os.environ.get("SNAPINSIGHT_COMPANION_AUTO_START", "true"),
            )
        ).lower()
        in {"1", "true", "yes", "on"},
        launch_at_login=str(
            file_config.get(
                "launch_at_login",
                os.environ.get("SNAPINSIGHT_COMPANION_LAUNCH_AT_LOGIN", "false"),
            )
        ).lower()
        in {"1", "true", "yes", "on"},
        health_poll_interval_seconds=float(
            file_config.get("health_poll_interval_seconds", 5.0)
        ),
        launch_executable=launch_executable,
        paths=paths,
    )
