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
- [x] Offer an explicit cancel action after 5 seconds without visible output.
- [x] Describe acquisition, response wait, and possible runtime wake-up from
  observed request phases without changing model preparation semantics.
- [x] Add a coarse, in-memory idle-age diagnostic bucket to JSON performance
  logs without using it for UI or lifecycle decisions.
- [x] Extract and test cancellable warm-up debounce.
- [x] Update architecture, compatibility, localization, and release-note inputs.
- [x] Retain used keepers for the surviving document lifetime, including while
  hidden.
- [x] Coordinate a privacy-safe five-keeper LRU limit through the Service Worker.

## Automated Verification

Executed from a clean dependency install on 2026-08-21:

```text
npm ci          passed
npm run check   passed
npm test        89 passed, 0 failed
npm run build   passed
```

Focused coverage includes:

- concurrent warm-up and acquisition share one template creation;
- request clones remain isolated and are released independently;
- clone absence preserves the keeper and uses independent request sessions;
- invalid-state clone failure invalidates and rebuilds the template once;
- `downloadable` warm-up never calls `create()`;
- unused warm-up expires while used keepers survive visibility changes;
- global keeper coordination retains five entries and evicts hidden LRU pages
  first;
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
dist/worker.js           3.50 kB (gzip 1.30 kB)
dist/assets/options.js  15.92 kB (gzip 6.06 kB)
dist/content.js         52.86 kB (gzip 15.47 kB)
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
- Product and package versions remain `0.3.2`; feature work does not manually
  consume the next release version.
- Release Please will derive the user-visible version entry from Conventional
  Commits; no legacy release-candidate file was created.

## Real Chrome Release Gate

Completed on 2026-08-21 with this worktree's exact production build loaded as
an unpacked extension:

1. cold/reloaded first requests entered acquisition feedback at about 2.3
   seconds, exposed cancellation at about 5.2 seconds, and produced first
   visible output after about 20.7 seconds in one run and 28.8 seconds in an
   earlier run;
2. repeated same-page requests produced first output in about 0.13–0.29 seconds;
3. short-to-detail generation completed normally, with detail first output at
   about 0.54 seconds and the short explanation preserved;
4. request replacement and explicit cancellation cleared stale UI without old
   output leaking into the active request;
5. concurrent requests in two pages remained isolated, and a keeper retained
   by another page restored a background page after more than four minutes with
   first output in about 0.29 seconds;
6. model preparation remained separate from request loading feedback, with
   `downloadable` and `downloading` mappings covered by automated tests;
7. acquisition, first-token, and visible-wait JSON diagnostics contained only
   privacy-safe timing metadata;
8. no SnapInsight runtime console errors or quota/resource failures were
   observed; unrelated extension errors were excluded.

These runs validate phase behavior and lifecycle recovery, but the small sample
does not support a statistical P50/P95 latency claim.

## Development and Release Flow

The feature and its real-Chrome gate are complete. The remaining repository
workflow is:

1. commit the reviewed changes with a `fix:` Conventional Commit;
2. push `main` and require CI to pass;
3. allow Release Please to update the automated patch Release PR from `0.3.2`;
4. review and merge that Release PR when ready, letting the workflow create the
   immutable `v<version>` tag, verified archive, checksum, and GitHub Release
   automatically.

## Change Record

- 2026-08-13: Completed implementation, automated verification, build, and
  document-alignment review; retained real Chrome latency measurement as the
  explicit pre-release environment gate.
- 2026-08-13: Replaced the 60-second visible idle TTL with a document-lifetime
  keeper, extended hidden retention to 5 minutes, and preserved the keeper on
  the no-clone fallback path after real-use cold-start feedback.
- 2026-08-13: Replaced the hidden timeout with document-lifetime retention and
  added a five-keeper, hidden-first LRU guard coordinated by the Service Worker.
- 2026-08-21: Added phase-accurate progressive loading feedback, privacy-safe
  idle-age diagnostics, earlier cancellation, and completed the automated and
  real-Chrome release gates against the production build.
