from __future__ import annotations

import rumps

from .app import CompanionController


class SnapInsightCompanionMenuApp(rumps.App):
    def __init__(self, controller: CompanionController) -> None:
        super().__init__("SnapInsight", title="SI", quit_button=None)
        self.controller = controller

        self.status_service = rumps.MenuItem("Service: unknown")
        self.status_ollama = rumps.MenuItem("Ollama: unknown")
        self.status_models = rumps.MenuItem("Models: unknown")
        self.status_error = rumps.MenuItem("Error: none")
        self.auto_start_item = rumps.MenuItem("Auto-start local API")
        self.launch_at_login_item = rumps.MenuItem("Launch at Login")
        self.start_item = rumps.MenuItem("Start local API")
        self.stop_item = rumps.MenuItem("Stop local API")
        self.open_logs_item = rumps.MenuItem("Open logs")
        self.open_config_item = rumps.MenuItem("Open config")
        self.quit_item = rumps.MenuItem("Quit")

        self.auto_start_item.set_callback(self._on_toggle_auto_start)
        self.launch_at_login_item.set_callback(
            self._on_toggle_launch_at_login
            if self.controller.login_item_manager.is_available()
            else None
        )
        self.start_item.set_callback(self._on_start)
        self.stop_item.set_callback(self._on_stop)
        self.open_logs_item.set_callback(self._on_open_logs)
        self.open_config_item.set_callback(self._on_open_config)
        self.quit_item.set_callback(self._on_quit)

        self.menu = [
            self.status_service,
            self.status_ollama,
            self.status_models,
            self.status_error,
            None,
            self.auto_start_item,
            self.launch_at_login_item,
            None,
            self.start_item,
            self.stop_item,
            self.open_logs_item,
            self.open_config_item,
            None,
            self.quit_item,
        ]
        self.timer = rumps.Timer(self._on_poll, controller.config.health_poll_interval_seconds)

    def run(self, **options: object) -> None:
        self._refresh_menu()
        self.timer.start()
        if self.controller.config.auto_start_service:
            try:
                self.controller.start_service()
            except Exception as error:  # noqa: BLE001
                self.controller.logger.exception("Failed to auto-start local API: %s", error)
                self.controller.refresh_status()
            self._refresh_menu()
        super().run(**options)

    def _on_poll(self, _timer: rumps.Timer) -> None:
        self.controller.refresh_status()
        self._refresh_menu()

    def _refresh_menu(self) -> None:
        status = self.controller.status
        if status.service_healthy and status.service_pid:
            self.status_service.title = f"Service: healthy (managed pid {status.service_pid})"
        elif status.service_healthy:
            self.status_service.title = "Service: healthy (external)"
        elif status.service_running:
            self.status_service.title = "Service: starting or unavailable"
        else:
            self.status_service.title = "Service: stopped"
        self.status_ollama.title = (
            "Ollama: reachable" if status.ollama_reachable else "Ollama: unavailable"
        )
        self.status_models.title = (
            f"Models: {status.model_catalog_state} ({status.model_count})"
        )
        self.status_error.title = f"Error: {status.last_error or 'none'}"
        self.auto_start_item.state = 1 if self.controller.config.auto_start_service else 0
        self.launch_at_login_item.state = (
            1 if self.controller.launch_at_login_enabled else 0
        )
        if self.controller.login_item_manager.is_available():
            self.launch_at_login_item.title = "Launch at Login"
        else:
            self.launch_at_login_item.title = "Launch at Login (packaged app only)"

    def _on_toggle_auto_start(self, _sender: rumps.MenuItem) -> None:
        enabled = not self.controller.config.auto_start_service
        self.controller.set_auto_start_service(enabled)
        self._refresh_menu()

    def _on_toggle_launch_at_login(self, _sender: rumps.MenuItem) -> None:
        enabled = not self.controller.launch_at_login_enabled
        try:
            self.controller.set_launch_at_login(enabled)
        except Exception as error:  # noqa: BLE001
            self.controller.logger.exception("Failed to update Launch at Login: %s", error)
            rumps.alert("SnapInsight", "更新开机自启失败", str(error))
        self._refresh_menu()

    def _on_start(self, _sender: rumps.MenuItem) -> None:
        try:
            self.controller.start_service()
        except Exception as error:  # noqa: BLE001
            self.controller.logger.exception("Failed to start local API: %s", error)
            rumps.alert("SnapInsight", "启动本地服务失败", str(error))
            self.controller.refresh_status()
        self._refresh_menu()

    def _on_stop(self, _sender: rumps.MenuItem) -> None:
        self.controller.stop_service()
        self._refresh_menu()

    def _on_open_logs(self, _sender: rumps.MenuItem) -> None:
        self.controller.open_logs()

    def _on_open_config(self, _sender: rumps.MenuItem) -> None:
        self.controller.open_config()

    def _on_quit(self, _sender: rumps.MenuItem) -> None:
        self.controller.stop_service()
        rumps.quit_application()
