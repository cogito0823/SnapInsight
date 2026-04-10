from __future__ import annotations

from dataclasses import replace
import logging
import subprocess
from pathlib import Path

from .config import CompanionConfig, update_config_payload
from .login_item import MacOSLoginItemManager
from .process_manager import LocalApiProcessManager
from .status_checks import CompanionStatusSnapshot, collect_status


class CompanionController:
    def __init__(
        self,
        config: CompanionConfig,
        logger: logging.Logger,
        process_manager: LocalApiProcessManager,
        login_item_manager: MacOSLoginItemManager,
    ) -> None:
        self.config = config
        self.logger = logger
        self.process_manager = process_manager
        self.login_item_manager = login_item_manager
        self.launch_at_login_enabled = (
            login_item_manager.is_enabled()
            if login_item_manager.is_available()
            else config.launch_at_login
        )
        self.status = CompanionStatusSnapshot(
            service_running=False,
            service_healthy=False,
            service_pid=None,
            ollama_reachable=False,
            model_catalog_state="unknown",
            model_count=0,
            last_error=None,
        )
        if self.launch_at_login_enabled != self.config.launch_at_login:
            self._persist_config(launch_at_login=self.launch_at_login_enabled)

    def refresh_status(self) -> CompanionStatusSnapshot:
        self.status = collect_status(self.config, self.process_manager.snapshot())
        return self.status

    def start_service(self) -> CompanionStatusSnapshot:
        self.process_manager.start()
        return self.refresh_status()

    def stop_service(self) -> CompanionStatusSnapshot:
        self.process_manager.stop()
        return self.refresh_status()

    def open_logs(self) -> None:
        self._open_path(self.process_manager.open_logs_path())

    def open_config(self) -> None:
        config_file = self.config.paths.config_file
        config_file.parent.mkdir(parents=True, exist_ok=True)
        if not config_file.exists():
            update_config_payload(config_file)
        self._open_path(config_file)

    def set_auto_start_service(self, enabled: bool) -> None:
        self._persist_config(auto_start_service=enabled)

    def set_launch_at_login(self, enabled: bool) -> None:
        self.launch_at_login_enabled = self.login_item_manager.set_enabled(enabled)
        self._persist_config(launch_at_login=self.launch_at_login_enabled)
        self.launch_at_login_enabled = self.config.launch_at_login

    def _open_path(self, path: Path) -> None:
        subprocess.run(["open", str(path)], check=False)

    def _persist_config(
        self,
        *,
        auto_start_service: bool | None = None,
        launch_at_login: bool | None = None,
    ) -> None:
        payload = update_config_payload(
            self.config.paths.config_file,
            trusted_extension_id=self.config.trusted_extension_id or "",
            auto_start_service=(
                self.config.auto_start_service
                if auto_start_service is None
                else auto_start_service
            ),
            launch_at_login=(
                self.config.launch_at_login
                if launch_at_login is None
                else launch_at_login
            ),
        )
        self.config = replace(
            self.config,
            auto_start_service=bool(payload.get("auto_start_service", False)),
            launch_at_login=bool(payload.get("launch_at_login", False)),
        )
