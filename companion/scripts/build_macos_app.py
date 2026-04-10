from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


SETUP_TEMPLATE = """\
from setuptools import find_packages, setup

APP = ["mac_app.py"]
OPTIONS = {
    "argv_emulation": False,
    "plist": {
        "CFBundleName": "SnapInsight",
        "CFBundleDisplayName": "SnapInsight",
        "CFBundleIdentifier": "com.snapinsight.companion",
        "CFBundleShortVersionString": "0.1.0",
        "CFBundleVersion": "0.1.0",
        "LSUIElement": True,
        "PyRuntimeLocations": [
            "@executable_stub/../MacOS/python",
            "__PYTHON_RUNTIME_LOCATION__",
        ],
    },
    "packages": [
        "annotated_doc",
        "annotated_types",
        "anyio",
        "certifi",
        "click",
        "dotenv",
        "h11",
        "httpcore",
        "snapinsight_companion",
        "rumps",
        "httpx",
        "httptools",
        "idna",
        "pydantic",
        "pydantic_core",
        "uvicorn",
        "uvloop",
        "fastapi",
        "pydantic_settings",
        "sniffio",
        "starlette",
        "typing_extensions",
        "typing_inspection",
        "watchfiles",
        "websockets",
        "yaml",
    ],
    "resources": ["resources/server"],
}

setup(
    app=APP,
    package_dir={"": "src"},
    packages=find_packages("src"),
    options={"py2app": OPTIONS},
    setup_requires=["py2app"],
)
"""


def remove_tree(path: Path) -> None:
    if not path.exists():
        return

    shutil.rmtree(path, ignore_errors=True)
    if path.exists():
        subprocess.run(["/bin/rm", "-rf", str(path)], check=True)


def main() -> None:
    companion_dir = Path(__file__).resolve().parents[1]
    repo_root = companion_dir.parent
    server_dir = repo_root / "server"
    server_app_dir = server_dir / "app"
    staged_server_dir = companion_dir / "build-support" / "resources" / "server"
    staging_dir = companion_dir / "build-support" / "py2app-staging"
    build_dir = companion_dir / "build"
    dist_dir = companion_dir / "dist"
    python_runtime_location = (
        Path(sys.base_prefix) / "Python"
        if (Path(sys.base_prefix) / "Python").exists()
        else Path(sys.base_prefix) / "lib" / f"libpython{sys.version_info.major}.{sys.version_info.minor}.dylib"
    )

    if not server_app_dir.exists():
        raise SystemExit(f"Server app directory not found: {server_app_dir}")

    remove_tree(build_dir)
    remove_tree(dist_dir)
    remove_tree(staging_dir)

    staged_server_dir.mkdir(parents=True, exist_ok=True)
    staged_app_dir = staged_server_dir / "app"
    if staged_app_dir.exists():
        shutil.rmtree(staged_app_dir)

    shutil.copytree(server_app_dir, staged_app_dir)
    staging_dir.mkdir(parents=True, exist_ok=True)
    shutil.copytree(companion_dir / "src", staging_dir / "src")
    shutil.copytree(staged_server_dir, staging_dir / "resources" / "server")
    shutil.copy2(companion_dir / "mac_app.py", staging_dir / "mac_app.py")
    (staging_dir / "setup.py").write_text(
        SETUP_TEMPLATE.replace(
            "__PYTHON_RUNTIME_LOCATION__",
            str(python_runtime_location),
        ),
        encoding="utf-8",
    )

    subprocess.run(
        [sys.executable, "setup.py", "py2app"],
        cwd=staging_dir,
        check=True,
    )

    dist_dir.mkdir(parents=True, exist_ok=True)
    shutil.move(str(staging_dir / "dist" / "SnapInsight.app"), dist_dir / "SnapInsight.app")


if __name__ == "__main__":
    main()
