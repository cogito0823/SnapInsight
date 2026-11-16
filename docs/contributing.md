# Contributing to SnapInsight

The [documentation rules](governance/documentation.md) and [workflow rules](governance/workflow.md) apply to both Codex and Cursor. The [document index](README.md) routes work to current requirements, decisions, contracts, plans and records. `product/` holds privacy, compatibility, release and store material. `assets/` holds documentation media. `discovery/` holds exploratory work. The active document roots and bridge setting are configured in [project.json](governance/project.json).

Before starting or resuming implementation, read the [implementation plan](plans/implementation-plan.md) for the active batch, [project progress](plans/project-progress.md) for work and blockers, and the [implementation checklist](plans/implementation-checklist.md) for the applicable acceptance steps. Read the [PRD](prd/PRD-snapinsight.md) for user behavior, scope and acceptance, the [extension architecture](design/extension-architecture.md) for runtime ownership and module placement, and the applicable implementation design for the area being changed.

- For the content script, device status and worker, use the relevant sections of the [extension state and contracts](specs/extension-state-spec.md) for interaction state, errors and extension messages.
- For Prompt API, streaming and keeper changes, also read the [session implementation design](design/implementation-design/prompt-session-latency-implementation-design.md) and [RFC-007](rfcs/RFC-007-prompt-session-lifecycle-and-latency.md).
- For document governance formats and checks, use the [governance specification](specs/project-governance-spec.md). Use the release process and store checklist for publishing work.

For discovery format, see the [technical architecture questions](discovery/technical-architecture-questions.md) as a layout example. Follow the governance specification for required metadata and link approval evidence from each current formal reference. Keep additional fields such as `Owner`, `Reviewers` and document version optional unless the applicable workflow calls for them.

## Verification

- Governance and documentation from the repository root: `node scripts/governance/check.mjs`. For a prepared change use `--mode index`; CI uses `--mode commit`.
- Extension changes from `extension/`: install with `npm ci`, then run `npm run check`, `npm test` and `npm run build`. Check relevant cases in Chrome when UI, device readiness, session lifecycle or permissions change.
- Use the repository-root `.venv` for all Python work, including `python`, `pip`, `pytest`, `uvicorn`, scripts and one-off commands. If absent, create it from the repository root with `python3 -m venv .venv`. Before each Python-related command, activate the environment in the same shell context. From the root use `source .venv/bin/activate && <command>`. From a subdirectory, source `.venv/bin/activate` via its absolute path at the repository root. Use a system Python environment or global virtualenv for project work only with an explicit user override.
- Record store and device test results separately from automated builds. Follow the [release process](product/release-process.md) for release artifacts.

## Exceptions

None.
