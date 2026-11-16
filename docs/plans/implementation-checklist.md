# SnapInsight implementation checklist

- Type: record
- Status: Draft
- Applicability: current
- Approval: none
- Superseded-By: none

- [x] Complete the local governance migration and the document, source and checker reviews in the [rollout plan](shared-agent-governance-implementation-plan.md).
- [x] Verify PR #12 candidate CI and post-merge `main` CI in the [governance acceptance record](shared-agent-governance-design-review.md#post-merge-review).
- [x] Configure `main` protection and verify the [effective settings](shared-agent-governance-design-review.md#main-branch-protection) through GitHub.
- [ ] Confirm merge enforcement in the next live PR. Cursor acceptance remains deferred.
- [ ] Complete pending device tests and reconcile the live listing with the [Chrome Web Store checklist](../product/chrome-web-store-checklist.md).

The original checklist and completion evidence are retained at `2674a9b630dca079b07dab266451ae7d3afd97f7:docs/plans/implementation-checklist.md`.
