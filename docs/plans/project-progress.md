# SnapInsight project progress

- Type: record
- Status: Draft
- Applicability: current
- Approval: none
- Superseded-By: none

## Current baseline

GitHub `main` was verified on 2026-11-17 at `58697de2141dbf8c6610750f8cb401d67e3b2706`, the merge of PR #12 and the base of this documentation update. The initial local worktree was on `20b562f2712c56b57225304948d7dd59870d8315`, which has the same tree `4b7fd88124c8065528a22213fb463a7dc8d9746f`. The `v0.3.4` release commit is `2674a9b630dca079b07dab266451ae7d3afd97f7`. The shipped code uses Chrome Prompt API, with streamed short and detailed explanations, page keepers and state guidance for model preparation and slow requests. The code has no Python inference service or companion app.

## Documentation synchronization — 2026-11-17

- Started: compare current references with the latest merged implementation, correct storage disclosures and governance acceptance evidence, then perform source-to-document and cross-document reviews. Preserve untracked store assets and historical acceptance records. This work changes documentation only.
- Delivered for local review. Updated both READMEs, current behavior and storage references, governance records, release and store material, and the index. The owner accepted [RFC-009](../rfcs/RFC-009-governance-rollout-before-cursor-acceptance.md) and [RFC-010](../rfcs/RFC-010-prompt-performance-event-fields.md). The approved exception and diagnostic field list are reflected in RFC-008 and RFC-007.
- Round 1, source and evidence. Matched selection and card behavior to `read-selection.ts`, `count-selection-units.ts`, `start-content-app.ts`, `render-app.ts` and the selection, request and rendering tests. Matched device status and timestamp behavior to `start-options-app.ts`, `readiness.ts`, `options-page.ts` and the device readiness tests. Storage writes and reset conditions were read from the source. The existing device tests exercise readiness, progress and elapsed time formatting. Matched session behavior, message replies and storage to `prompt-session-pool.ts`, `prompt-client.ts`, `register-product-entrypoints.ts`, `keeper-coordinator.ts` and the corresponding tests. Checked version, release and governance statements against the Manifest, workflows, PRs #10–#12, CI execution, release assets and public store page.
- Round 2, consistency. Compared the English and Chinese READMEs, both privacy policy formats and the store checklist for matching selection scope, setup behavior and storage disclosures. Cross-checked the release tag, merged commit, CI outcomes, branch rules and public store version across progress, rollout, review and release records. Checked the current, proposed and historical index sections, local links, approval references and metadata. Historical records and store assets were preserved.
- This run. `node scripts/governance/check.mjs` passed on the delivery worktree (31 formal documents, 52 Markdown inputs and 3 managed files). `git diff --check` and governance tests (10/10) passed. Commit mode also passed for local HEAD `20b562f`, whose tree matches merged main. In `extension/`, `npm ci`, `npm run check`, `npm test` (90/90), `npm run build` and `node scripts/verify-release-version.mjs 0.3.4` passed. The downloaded release ZIP matched the published SHA-256 and passed archive integrity and Manifest inspection.
- Existing CI. Candidate `d3d689b` and merge `58697de` passed both CI jobs, as recorded below. The Release failure and branch protection are tracked separately.
- Outstanding. Chrome device, timestamp persistence and navigation tests and the store dashboard were not exercised in this documentation review. Cursor acceptance remains deferred. The revised disclosures still require synchronization to the live store listing and privacy link.

## Governance migration and acceptance

- 2026-11-17. The owner approved [RFC-008](../rfcs/RFC-008-shared-agent-project-governance.md). The documentation, shared rules, checker, PR template and CI configuration have been migrated. See the [rollout plan](shared-agent-governance-implementation-plan.md) and [multi-round review](shared-agent-governance-design-review.md#implementation-review).
- 2026-11-17. The Chrome connection read the public repository. Fresh read-only Codex sessions used the shared rules from the repository root and `extension/`. The root instructions now explicitly anchor document paths to the Git root.
- 2026-11-17. Rechecked all three legacy rule files against the shared rules. Restored omitted collaboration, RFC, approval, implementation and Python details. See the [rule parity review](shared-agent-governance-design-review.md#rule-parity-review).
- 2026-11-17. GitHub Actions verified the governance migration at `d3d689b` in draft [PR #12](https://github.com/cogito0823/SnapInsight/pull/12). Both Project governance and Extension checks passed in the [CI run](https://github.com/cogito0823/SnapInsight/actions/runs/43947971819).
- 2026-11-17. PR #12 merged at `58697de`. Both jobs passed in [post-merge CI](https://github.com/cogito0823/SnapInsight/actions/runs/43948668627). The separate [Release run](https://github.com/cogito0823/SnapInsight/actions/runs/43948668545) failed at Release Please with `Bad credentials` and skipped packaging. See the [acceptance addendum](shared-agent-governance-design-review.md#post-merge-review).
- 2026-11-17. The owner updated `RELEASE_PLEASE_TOKEN`. [Release attempt 2](https://github.com/cogito0823/SnapInsight/actions/runs/43948668545/attempts/2) passed. Release Please found no user-facing commits since `v0.3.4`, so it skipped creating a release PR and the packaging job did not run.
- 2026-11-17. Enabled and verified `main` protection through the GitHub API at `58697de`. The rule requires a PR, both CI jobs and resolved review conversations, and applies to administrators. Required approvals are set to zero for solo maintenance. See the [branch protection record](shared-agent-governance-design-review.md#main-branch-protection).

## Next work and unresolved items

- Store release follow-up. Public listing and GitHub Release show 0.3.4. The release archive has been verified. Device and navigation scenarios, store dashboard records, and synchronization of live disclosures and the privacy link remain open in the [store checklist](../product/chrome-web-store-checklist.md).
- Governance acceptance. Cursor testing is deferred at the owner's request. Confirm merge enforcement in the next live PR.
- Cross-project adoption. Reuse can be tested with a local fixture. Production adoption awaits a second real project.

## Historical evidence

- The [0.2.0 productization validation](../product/productization-validation.md) and [session implementation record](prompt-session-latency-implementation-plan.md) retain dated automated and real Chrome results.
- Batch 0–8 and Companion App work is preserved at `2674a9b630dca079b07dab266451ae7d3afd97f7:docs/plans/project-progress.md`.
