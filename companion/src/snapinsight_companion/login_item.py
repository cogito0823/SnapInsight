from __future__ import annotations

import logging
import os
import plistlib
import subprocess
from pathlib import Path

from .paths import CompanionPaths, resolve_packaged_app_bundle

LOGIN_ITEM_LABEL = "com.snapinsight.companion.loginitem"


class LoginItemUnavailableError(RuntimeError):
    pass


class MacOSLoginItemManager:
    def __init__(self, paths: CompanionPaths, logger: logging.Logger) -> None:
        self._paths = paths
        self._logger = logger

    def is_available(self) -> bool:
        return self.app_bundle_path is not None

    @property
    def app_bundle_path(self) -> Path | None:
        return resolve_packaged_app_bundle()

    def is_enabled(self) -> bool:
        plist_path = self._paths.login_item_plist_file
        if not plist_path.exists():
            return False

        try:
            payload = plistlib.loads(plist_path.read_bytes())
        except Exception:  # noqa: BLE001
            return False

        program_arguments = payload.get("ProgramArguments", [])
        expected_executable = self._expected_executable_path()
        return (
            isinstance(program_arguments, list)
            and len(program_arguments) == 1
            and program_arguments[0] == expected_executable
        )

    def set_enabled(self, enabled: bool) -> bool:
        if not self.is_available():
            raise LoginItemUnavailableError(
                "Launch at Login is only available when running the packaged SnapInsight app."
            )

        plist_path = self._paths.login_item_plist_file
        plist_path.parent.mkdir(parents=True, exist_ok=True)
        self._paths.logs_dir.mkdir(parents=True, exist_ok=True)

        if enabled:
            payload = self._build_launch_agent_payload()
            plist_path.write_bytes(plistlib.dumps(payload))
            self._logger.info("Enabled Launch at Login using %s", plist_path)
            return True

        self._bootout_loaded_agent()
        if plist_path.exists():
            plist_path.unlink()
        self._logger.info("Disabled Launch at Login and removed %s", plist_path)
        return False

    def _build_launch_agent_payload(self) -> dict[str, object]:
        executable_path = self._expected_executable_path()
        return {
            "Label": LOGIN_ITEM_LABEL,
            "ProgramArguments": [executable_path],
            "RunAtLoad": True,
            "KeepAlive": False,
            "ProcessType": "Interactive",
            "LimitLoadToSessionType": ["Aqua"],
            "StandardOutPath": str(self._paths.logs_dir / "launch-agent.stdout.log"),
            "StandardErrorPath": str(self._paths.logs_dir / "launch-agent.stderr.log"),
        }

    def _expected_executable_path(self) -> str:
        app_bundle_path = self.app_bundle_path
        if app_bundle_path is None:
            raise LoginItemUnavailableError(
                "Could not resolve the packaged SnapInsight app bundle path."
            )

        return str(app_bundle_path / "Contents" / "MacOS" / "SnapInsight")

    def _bootout_loaded_agent(self) -> None:
        plist_path = self._paths.login_item_plist_file
        if not plist_path.exists():
            return

        try:
            self._run_launchctl("bootout", str(plist_path))
        except subprocess.CalledProcessError:
            self._logger.debug("Launch agent bootout returned non-zero for %s", plist_path)

    def _run_launchctl(self, command: str, plist_path: str) -> None:
        subprocess.run(
            [
                "/bin/launchctl",
                command,
                f"gui/{os.getuid()}",
                plist_path,
            ],
            check=True,
        )
