from __future__ import annotations

import logging
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import TextIO

from .config import CompanionConfig
from .paths import is_packaged_runtime


@dataclass(frozen=True)
class ManagedProcessSnapshot:
    running: bool
    pid: int | None


class LocalApiProcessManager:
    def __init__(self, config: CompanionConfig, logger: logging.Logger) -> None:
        self._config = config
        self._logger = logger
        self._process: subprocess.Popen[str] | None = None
        self._stdout_handle: TextIO | None = None
        self._stderr_handle: TextIO | None = None

    def snapshot(self) -> ManagedProcessSnapshot:
        process = self._process
        if process is None:
            return ManagedProcessSnapshot(running=False, pid=None)

        if process.poll() is not None:
            self._logger.warning("Managed local API process exited with code %s", process.returncode)
            self._process = None
            if self._stdout_handle is not None:
                self._stdout_handle.close()
                self._stdout_handle = None
            if self._stderr_handle is not None:
                self._stderr_handle.close()
                self._stderr_handle = None
            return ManagedProcessSnapshot(running=False, pid=None)

        return ManagedProcessSnapshot(running=True, pid=process.pid)

    def start(self) -> ManagedProcessSnapshot:
        if not self._config.trusted_extension_id:
            raise RuntimeError(
                "SNAPINSIGHT_TRUSTED_EXTENSION_ID is required before the local API can start."
            )

        current = self.snapshot()
        if current.running:
            return current

        env = os.environ.copy()
        existing_pythonpath = env.get("PYTHONPATH")
        env["PYTHONPATH"] = (
            f"{self._config.paths.server_source_dir}:{existing_pythonpath}"
            if existing_pythonpath
            else str(self._config.paths.server_source_dir)
        )
        env["SNAPINSIGHT_TRUSTED_EXTENSION_ID"] = self._config.trusted_extension_id
        env["SNAPINSIGHT_HOST"] = self._config.host
        env["SNAPINSIGHT_PORT"] = str(self._config.port)
        env["SNAPINSIGHT_OLLAMA_BASE_URL"] = self._config.ollama_base_url
        env["SNAPINSIGHT_SERVER_SOURCE_DIR"] = str(self._config.paths.server_source_dir)
        if self._config.debug_logging:
            env["SNAPINSIGHT_DEBUG_LOGGING"] = "true"

        logs_dir = self._config.paths.logs_dir
        logs_dir.mkdir(parents=True, exist_ok=True)
        stdout_log = logs_dir / "local-api.stdout.log"
        stderr_log = logs_dir / "local-api.stderr.log"
        self._stdout_handle = stdout_log.open("a", encoding="utf-8")
        self._stderr_handle = stderr_log.open("a", encoding="utf-8")

        self._logger.info("Starting managed local API from %s", self._config.paths.server_source_dir)
        launch_command = self._build_launch_command()
        self._process = subprocess.Popen(
            launch_command,
            cwd=self._config.paths.server_source_dir,
            env=env,
            stdout=self._stdout_handle,
            stderr=self._stderr_handle,
            text=True,
        )
        self._logger.info("Managed local API started with pid %s", self._process.pid)
        return self.snapshot()

    def stop(self) -> ManagedProcessSnapshot:
        process = self._process
        if process is None:
            return ManagedProcessSnapshot(running=False, pid=None)

        self._logger.info("Stopping managed local API pid %s", process.pid)
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self._logger.warning("Managed local API did not stop in time; killing pid %s", process.pid)
            process.kill()
            process.wait(timeout=5)

        self._process = None
        if self._stdout_handle is not None:
            self._stdout_handle.close()
            self._stdout_handle = None
        if self._stderr_handle is not None:
            self._stderr_handle.close()
            self._stderr_handle = None
        return ManagedProcessSnapshot(running=False, pid=None)

    def open_logs_path(self) -> Path:
        self._config.paths.logs_dir.mkdir(parents=True, exist_ok=True)
        return self._config.paths.logs_dir

    def _build_launch_command(self) -> list[str]:
        if is_packaged_runtime():
            return [
                self._config.launch_executable,
                "--run-local-api",
            ]

        return [
            self._config.launch_executable,
            "-m",
            "snapinsight_companion",
            "--run-local-api",
        ]
