from __future__ import annotations

import argparse
import json
import sys

from .app import CompanionController
from .config import CompanionConfig
from .config import load_config
from .login_item import MacOSLoginItemManager
from .logging import configure_logging
from .process_manager import LocalApiProcessManager


def run(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Run the SnapInsight companion app.")
    parser.add_argument(
        "--status-once",
        action="store_true",
        help="Print one status snapshot and exit instead of launching the menu-bar app.",
    )
    parser.add_argument(
        "--run-local-api",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    args = parser.parse_args(argv)

    config = load_config()
    config.paths.app_support_dir.mkdir(parents=True, exist_ok=True)
    logger = configure_logging(config.paths.companion_log_file, config.debug_logging)
    login_item_manager = MacOSLoginItemManager(config.paths, logger)

    if args.run_local_api:
        _run_local_api_process(config)
        return

    process_manager = LocalApiProcessManager(config, logger)
    controller = CompanionController(config, logger, process_manager, login_item_manager)

    if args.status_once:
        status = controller.refresh_status()
        print(json.dumps(status.__dict__, ensure_ascii=False, indent=2))
        return

    from .menu import SnapInsightCompanionMenuApp

    app = SnapInsightCompanionMenuApp(controller)
    app.run()


def _run_local_api_process(config: CompanionConfig) -> None:
    server_source_dir = str(config.paths.server_source_dir)
    if server_source_dir not in sys.path:
        sys.path.insert(0, server_source_dir)

    from app.main import run as run_local_api

    run_local_api()


if __name__ == "__main__":
    run()
