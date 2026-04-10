from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CompanionPaths:
    app_support_dir: Path
    logs_dir: Path
    launch_agents_dir: Path
    config_file: Path
    companion_log_file: Path
    login_item_plist_file: Path
    server_source_dir: Path


def is_packaged_runtime() -> bool:
    return resolve_packaged_resources_dir() is not None


def resolve_packaged_launcher_executable() -> Path | None:
    packaged_resources_dir = resolve_packaged_resources_dir()
    if packaged_resources_dir is None:
        return None

    launcher_path = packaged_resources_dir.parent / "MacOS" / "SnapInsight"
    return launcher_path if launcher_path.exists() else None


def resolve_packaged_app_bundle() -> Path | None:
    packaged_resources_dir = resolve_packaged_resources_dir()
    if packaged_resources_dir is None:
        return None

    app_bundle_path = packaged_resources_dir.parent.parent
    return app_bundle_path if app_bundle_path.suffix == ".app" else None


def resolve_repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def resolve_packaged_resources_dir() -> Path | None:
    resourcepath = os.environ.get("RESOURCEPATH")
    if resourcepath:
        return Path(resourcepath)

    if not getattr(sys, "frozen", False):
        return None

    executable = Path(sys.executable).resolve()
    contents_dir = executable.parent.parent
    resources_dir = contents_dir / "Resources"
    return resources_dir if resources_dir.exists() else None


def resolve_default_server_source_dir() -> Path:
    packaged_resources_dir = resolve_packaged_resources_dir()
    if packaged_resources_dir is not None:
        packaged_server_dir = packaged_resources_dir / "server"
        if packaged_server_dir.exists():
            return packaged_server_dir

    return resolve_repo_root() / "server"


def build_companion_paths(server_source_dir: Path | None = None) -> CompanionPaths:
    app_support_dir = Path.home() / "Library" / "Application Support" / "SnapInsight"
    logs_dir = Path.home() / "Library" / "Logs" / "SnapInsight"
    launch_agents_dir = Path.home() / "Library" / "LaunchAgents"
    resolved_server_source_dir = server_source_dir or resolve_default_server_source_dir()

    return CompanionPaths(
        app_support_dir=app_support_dir,
        logs_dir=logs_dir,
        launch_agents_dir=launch_agents_dir,
        config_file=app_support_dir / "companion-config.json",
        companion_log_file=logs_dir / "companion.log",
        login_item_plist_file=launch_agents_dir / "com.snapinsight.companion.loginitem.plist",
        server_source_dir=resolved_server_source_dir,
    )
