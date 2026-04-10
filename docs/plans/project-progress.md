# SnapInsight Project Progress

## Document Status

- Status: Draft
- Related Documents:
  - `docs/plans/implementation-plan.md`
  - `docs/design/implementation-design/worker-settings-and-local-api-implementation-design.md`
  - `docs/design/implementation-design/content-script-interaction-implementation-design.md`
  - `docs/design/implementation-design/server-streaming-and-orchestration-implementation-design.md`

## 1. Purpose

This document records the current implementation status of SnapInsight.

It is intended to answer:

- what has already been completed
- what is currently in progress
- what should happen next
- what is blocked or still uncertain

This document should be updated as implementation progresses. It complements `docs/plans/implementation-plan.md` and does not replace it.

## 2. Current Status Summary

- Current overall status: Pre-implementation documentation ready
- Current execution point: Ready to begin `Batch 0` and then `Batch 1`
- Current implementation state: Core product, architecture, API, state, and implementation-design documents are in place; code implementation status has not yet been recorded as started

## 3. Completed

### 3.1 Product and Architecture Documentation

- Completed: PRD is available and defines product goals, scope, interaction rules, and acceptance criteria
- Completed: high-level extension and local-service design is available
- Completed: repository and module-structure design is available
- Completed: accepted RFC set is available for the current architecture and interaction decisions

### 3.2 Contract and State Documentation

- Completed: API spec is available for health, model list, explanation stream, stream events, error codes, and internal extension messages
- Completed: extension state spec is available for page-local state, request lifecycle, and storage rules

### 3.3 Implementation Guidance Documentation

- Completed: execution-oriented implementation plan is available
- Completed: worker, settings, and local API implementation-level design is available
- Completed: content-script interaction implementation-level design is available
- Completed: server streaming and orchestration implementation-level design is available

## 4. In Progress

- None currently recorded

## 5. Next Up

### Immediate Next Actions

- Start `Batch 0: Contract Readiness`
- Confirm current repository baseline against the implementation plan
- Start `Batch 1: Scaffold and Shared Boundary` after the batch-0 review note is recorded

### First Coding Targets

- scaffold `extension/` and `server/` if missing
- create runtime entrypoints for content, worker, options, and server
- create shared contracts for health, models, settings, explanation start, cancellation, and stream events

## 6. Current Batch Tracking

### Batch 0: Contract Readiness

- Status: Not started
- Goal: confirm no blocking contradiction remains across PRD, design, and specs
- Completion signal:
  - short review note exists
  - no blocking contradiction remains for scaffold work

### Batch 1: Scaffold and Shared Boundary

- Status: Not started
- Goal: create repository structure and shared extension contract boundary
- Completion signal:
  - repository structure matches approved design closely enough for implementation
  - shared contracts exist
  - runtime-owned state has not been misplaced into shared modules

### Batch 2: Local Service Foundation

- Status: Not started
- Goal: make the local service reachable and contract-shaped before UI integration

### Batch 3: Worker HTTP and Validated Persistence

- Status: Not started
- Goal: make the worker the only local-service caller and the owner of validated model persistence

### Batch 4: Settings Surface

- Status: Not started
- Goal: deliver a usable options page on top of the validated worker path

### Batch 5: In-Page Shell and Selection Snapshot

- Status: Not started
- Goal: establish the in-page trigger, card shell, and snapshot-based page-local state

### Batch 6: Short Explanation End-to-End

- Status: Not started
- Goal: complete the first end-to-end explanation flow

### Batch 7: Detailed Explanation and Coordination Rules

- Status: Not started
- Goal: complete the same-card detailed explanation flow and coordination rules

### Batch 8: Hardening and Release Readiness

- Status: Not started
- Goal: finish verification, alignment review, and release-readiness checks

## 7. Open Risks and Blockers

### Active Blockers

- None currently recorded

### Known Risks

- MV3 worker lifetime and stream bridge stability
- local-environment variability around Ollama availability
- stale-event handling bugs if routing and reset logic are incomplete
- accidental cross-runtime coupling during initial scaffolding

## 8. Implementation Notes

### Update Rules

When implementation starts, this document should be updated using the following rules:

- move work items from `Next Up` to `In Progress` when coding begins
- move items to `Completed` only when their batch-level verification and alignment review gate have passed
- record blockers explicitly rather than leaving progress implied in chat only
- keep entries outcome-focused and observable

### Recommended Entry Style

Prefer entries such as:

- Completed: `GET /health` returns fixed service identity
- In progress: worker `models.list` handler and selected-model validation path
- Next up: content-script accepted snapshot state container

Avoid vague entries such as:

- Completed: backend done
- In progress: fixing some issues

## 9. Change Log

- Initial project progress document created. Current state recorded as documentation-ready with implementation batches not yet started.
