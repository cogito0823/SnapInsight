# SnapInsight project progress

- Type: record
- Status: Draft
- Applicability: current
- Approval: none
- Superseded-By: none

## Current baseline

Local `main` at `2674a9b` identifies extension version 0.3.4. The shipped code uses Chrome Prompt API, with streamed short and detailed explanations, page keepers and state guidance for model preparation and slow requests. The code has no Python inference service or companion app.

## Completed in the working tree

- 2026-11-17. The owner approved [RFC-008](../rfcs/RFC-008-shared-agent-project-governance.md). The documentation, shared rules, checker, PR template and CI configuration have been migrated. See the [rollout plan](shared-agent-governance-implementation-plan.md) and [multi-round review](shared-agent-governance-design-review.md#implementation-review).
- 2026-11-17. The Chrome connection read the public repository. Fresh read-only Codex sessions used the shared rules from the repository root and `extension/`. The root instructions now explicitly anchor document paths to the Git root.
- 2026-11-17. Rechecked all three legacy rule files against the shared rules. Restored omitted collaboration, RFC, approval, implementation and Python details. See the [rule parity review](shared-agent-governance-design-review.md#rule-parity-review).

## Next work and unresolved items

- Store release readiness. Validate outstanding device and navigation scenarios and verify the release archive and checksum. Store submission and review status remain unverified. See the [store checklist](../product/chrome-web-store-checklist.md).
- Governance acceptance. Cursor testing is deferred at the owner's request. The candidate has no remote CI run. The latest recorded GitHub check showed remote `main` at `2674a9b` with no effective ruleset rules or branch protection. Configure and verify required checks once the candidate is on GitHub and the check name is available.
- Cross-project adoption. Reuse can be tested with a local fixture. Production adoption awaits a second real project.

## Historical evidence

- The [0.2.0 productization validation](../product/productization-validation.md) and [session implementation record](prompt-session-latency-implementation-plan.md) retain dated automated and real Chrome results.
- Batch 0–8 and Companion App work is preserved at `2674a9b630dca079b07dab266451ae7d3afd97f7:docs/plans/project-progress.md`.
