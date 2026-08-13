# Prompt Session Latency Implementation Plan

- Status: Implemented
- Related Documents:
  - `docs/rfcs/RFC-007-prompt-session-lifecycle-and-latency.md`
  - `docs/design/implementation-design/prompt-session-latency-implementation-design.md`
  - `docs/product/release-process.md`

## Objective

Reduce repeated Prompt API initialization cost after Chrome has downloaded the
model, distinguish cold-start phases in the user experience, and guarantee that
slow or unresponsive model operations can be cancelled and recovered without
changing SnapInsight's privacy or Service Worker boundaries.

## Completed Work

- [x] Record the session-lifecycle architecture decision in RFC-007.
- [x] Define module ownership, lifecycle, timeout, privacy, and test behavior in
  the implementation design.
- [x] Add privacy-safe local phase timing without content, URL, or identity data.
- [x] Add readiness, model-startup, first-token, and stream-stall timeouts.
- [x] Add progressive model-start and first-token loading feedback in English
  and Simplified Chinese.
- [x] Implement a page-scoped, single-flight template session.
- [x] Acquire isolated cloned sessions when `clone()` is available.
- [x] Fall back to independent request sessions without retaining conversational
  state or consuming the keeper when `clone()` is unavailable.
- [x] Retry one time after an invalid-state clone failure by invalidating and
  rebuilding the template.
- [x] Warm up only after a visible valid selection remains stable for 300 ms.
- [x] Prevent warm-up from triggering model download.
- [x] Retain a used keeper for the visible document lifetime, keep the
  15-second unused-warm-up TTL, and apply a 5-minute hidden-page grace period.
- [x] Dispose idle resources after the hidden-page TTL and immediately on
  `pagehide` or document-instance navigation.
- [x] Cancel pending session acquisition when an interaction is replaced or the
  card is closed.
- [x] Explicitly cancel the stream reader when a stream ignores its AbortSignal.
- [x] Destroy sessions that resolve after create or clone has already aborted.
- [x] Pause keeper disposal while request-session acquisition is in flight and
  restore the appropriate lifecycle after acquisition failure.
- [x] Restrict automatic clone recovery to invalid-state failures and apply
  quota backoff without speculative recreation.
- [x] Cache available readiness for 60 seconds and blocked readiness for 5
  seconds, with immediate invalidation after session failures.
- [x] Record acquisition, prewarm hit, visible wait, error, cancellation, and
  timeout performance outcomes.
- [x] Offer an explicit cancel action after 8 seconds without visible output.
- [x] Extract and test cancellable warm-up debounce.
- [x] Update architecture, compatibility, localization, and Unreleased notes.

## Automated Verification

Executed from a clean dependency install on 2026-08-13:

```text
npm ci          passed
npm run check   passed
npm test        70 passed, 0 failed
npm run build   passed
```

Focused coverage includes:

- concurrent warm-up and acquisition share one template creation;
- request clones remain isolated and are released independently;
- clone absence preserves the keeper and uses independent request sessions;
- invalid-state clone failure invalidates and rebuilds the template once;
- `downloadable` warm-up never calls `create()`;
- unused warm-up and hidden keeper TTLs destroy the template;
- abort releases acquisition even when clone ignores its signal;
- startup, first-token, and stream-stall timeouts surface the correct error;
- cancellation explicitly closes a pending stream reader;
- performance events contain timing metadata only;
- late create/clone results are destroyed after abort;
- quota errors do not retry and enforce backoff;
- readiness positive/negative caches avoid repeated checks;
- visible keeper retention, hidden-to-visible cancellation, and concurrent
  fallback isolation are enforced;
- pending acquisition cancellation and warm-up debounce are covered;
- long waits expose a localized cancel action;
- acquisition, prewarm hit, and end-to-end visible wait events are emitted.

Production build output:

```text
dist/options.html        0.35 kB (gzip 0.22 kB)
dist/worker.js           0.25 kB (gzip 0.17 kB)
dist/assets/options.js  11.99 kB (gzip 4.66 kB)
dist/content.js         51.09 kB (gzip 14.74 kB)
```

## Document and Boundary Alignment Review

- Prompt API calls remain in the Content Script isolated world.
- The Service Worker still owns only installation and toolbar entry points.
- Manifest permissions and host-access behavior are unchanged.
- Model preparation and download remain explicit user actions on device status.
- Warm-up runs only after an eligible interaction and never on page injection.
- Request history cannot leak across selections: cloned sessions are destroyed
  per request, and a no-clone keeper remains unprompted while every explanation
  uses a separately created request session.
- No telemetry, persistence, URL collection, selected text, prompt, or output
  collection was added.
- Product and package versions remain `0.2.7`; daily feature work does not
  consume the next release version.
- User-visible release notes were added to `CHANGELOG.md` under `Unreleased`;
  no legacy release-candidate file was created.

## Real Chrome Release Gate

The current connected Chrome did not have this worktree's freshly built
`extension/dist` loaded, so it could not provide valid runtime latency evidence
without changing the user's extension installation. No claim about improved
real-device P50/P95 is made from mock tests.

Before the release PR is approved, load the CI artifact or this exact build and
record the following on at least one supported Chrome device:

1. model-ready browser cold-start first explanation;
2. same-page consecutive explanation warm path;
3. short-to-detail transition;
4. cancellation during session acquisition and streaming;
5. page navigation, page hide, and multi-tab cleanup;
6. model `downloadable` and `downloading` setup messaging;
7. local measurements for availability, template creation, clone, and TTFT;
8. console error count and any quota/resource failures.

Real-device results should be attached to the feature PR or release verification
record. Threshold tuning may follow those measurements without changing the
accepted architecture.

## Development and Release Flow

The implementation is on `codex/prompt-session-latency`, created from the latest
`main`. The remaining repository workflow is:

1. open a feature Pull Request;
2. require PR CI and review;
3. merge into `main` and require `main` CI;
4. prepare the next product version only in a separate `release/<version>` PR;
5. create an immutable `v<version>` tag only after the target `main` CI passes.

## Change Record

- 2026-08-13: Completed implementation, automated verification, build, and
  document-alignment review; retained real Chrome latency measurement as the
  explicit pre-release environment gate.
- 2026-08-13: Replaced the 60-second visible idle TTL with a document-lifetime
  keeper, extended hidden retention to 5 minutes, and preserved the keeper on
  the no-clone fallback path after real-use cold-start feedback.
