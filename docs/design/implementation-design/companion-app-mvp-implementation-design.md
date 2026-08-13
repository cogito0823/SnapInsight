# Companion App MVP Implementation Design

## Document Status

- Status: Draft
- Related Documents:
  - `docs/discovery/local-companion-app-mvp.md`
  - `docs/rfcs/RFC-006-local-companion-app-architecture.md`
  - `docs/design/extension-and-local-service-design.md`
  - `docs/design/repository-and-code-structure.md`

## 1. Purpose

This document defines the execution-oriented implementation design for the first SnapInsight local companion app MVP.

The MVP goal is to make the current local service easier to run on macOS without changing the extension's explanation protocol or replacing Ollama.

## 2. MVP Scope

The companion app should:

- run on macOS only
- provide a menu-bar style local shell
- manage the existing Python service as a subprocess
- bundle Python runtime for packaged builds
- check local API health
- check local Ollama reachability and model availability
- provide lightweight status and control affordances

The companion app should not:

- replace Ollama
- introduce a new explanation protocol
- own extension card rendering
- duplicate the extension options page
- implement cloud mode

## 3. Repository Placement

Recommended top-level layout:

```text
SnapInsight/
  companion/
    pyproject.toml
    src/snapinsight_companion/
      __init__.py
      main.py
      app.py
      menu.py
      config.py
      logging.py
      process_manager.py
      status_checks.py
      paths.py
```

Rules:

- keep the companion runtime separate from `extension/` and `server/`
- treat `server/` as the service implementation dependency, not as a shared utility folder
- do not import extension runtime code into the companion app

## 4. Runtime Responsibilities

### 4.1 Companion App

The companion app should own:

- menu-bar startup
- menu-bar presentation, including the lightweight `SI` status-bar title
- subprocess lifecycle for the local API
- periodic health polling
- Ollama reachability probing
- available-model probing through the local API
- log file location and user-visible status text
- local menu-backed settings persistence for startup behavior
- login-item registration and removal for packaged macOS runs

The companion app should not own:

- explanation prompt construction
- extension worker messaging
- selected-model persistence
- direct Ollama explanation requests

### 4.2 Managed Local API Process

The managed process should continue using the current `server/` application entrypoint.

Recommended launch model:

- spawn a subprocess using the bundled or current Python interpreter
- invoke `uvicorn app.main:create_app --factory --host 127.0.0.1 --port 11435`
- set `PYTHONPATH` or packaged resource paths so `server/app` remains importable

## 5. Process Model

Recommended process manager behavior:

1. app launch initializes logging and menu shell
2. app optionally starts the local API subprocess immediately
3. status timer polls:
   - `GET /health`
   - local Ollama reachability
   - `GET /v1/models`
4. menu labels update from the current status snapshot
5. stop action terminates the subprocess cleanly
6. quit action stops the subprocess before exiting

Rules:

- keep only one managed local API process per companion app instance
- treat missing or dead subprocess as a recoverable local status, not as an unrecoverable crash
- fail closed on health-check ambiguity rather than assuming the API is healthy

## 6. Status Model

Recommended status fields:

- `service_running`
- `service_healthy`
- `service_pid`
- `ollama_reachable`
- `model_catalog_state`
- `model_count`
- `last_error`

The menu shell should render simple text derived from these fields.

The menu shell should also expose persistent toggles for:

- auto-starting the local API when the companion app launches
- launching the packaged companion app at macOS login

## 7. Logging

The companion app should write its own logs to a dedicated local log file path.

Recommended logged events:

- app startup
- subprocess start and stop
- subprocess failure
- health poll failures
- Ollama reachability failures

Do not log:

- selected text
- explanation content

## 8. Packaging Direction

MVP implementation direction:

- keep development run support simple
- add a packaging path that can later bundle Python runtime into a macOS app

The exact packaging command may evolve, but the code structure should keep resource paths and subprocess launch inputs centralized so packaging changes do not require widespread rewrites.

Current MVP packaging direction:

- use `py2app` for the first macOS `.app` build path
- package the menu-bar entry through `companion/mac_app.py`
- stage `server/app` into `companion/build-support/resources/server/app` during the build
- resolve packaged resources through the app `Resources` directory at runtime
- launch the managed local API through the companion executable in a dedicated `--run-local-api` mode so development and packaged builds share the same startup path
- register Launch at Login through a user-level LaunchAgent that points at the packaged `Contents/MacOS/SnapInsight` executable

## 9. Verification

Minimum verification for the MVP:

- companion app launches on macOS in development mode
- companion app can start the current local API
- companion app can stop the current local API
- companion app can show unhealthy status when Ollama is unavailable
- companion app can show available-model state when Ollama is ready
- extension still works against the managed local API without protocol changes
