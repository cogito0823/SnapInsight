# Prompt Session Latency Implementation Design

- Status: Approved
- Related Documents:
  - `docs/rfcs/RFC-007-prompt-session-lifecycle-and-latency.md`
  - `docs/product/compatibility.md`
  - `docs/product/privacy-policy.md`

## Goal

Reduce model-ready explanation latency without changing Chrome-owned download
semantics, inference privacy, or page-local interaction ownership. The change
must also make slow readiness, session acquisition, and first-token generation
observable and cancellable.

## Module Layout

```text
extension/src/content/prompt-api/
  prompt-client.ts
  prompt-session-pool.ts
  prompt-performance.ts
  prompt-warmup.ts
extension/src/worker/prompt-keeper/
  keeper-coordinator.ts
```

- `prompt-session-pool.ts` owns the page-local template, readiness cache,
  single-flight creation, per-request acquisition, backoff, and disposal.
- `prompt-client.ts` owns request validation, active request cancellation,
  streaming events, request-session cleanup, and error normalization.
- `prompt-performance.ts` emits privacy-safe development measurements.
- `prompt-warmup.ts` owns cancellable debounce for interaction-driven warm-up.
- `keeper-coordinator.ts` persists privacy-safe page keeper metadata across
  Worker suspension and enforces a global five-keeper LRU guard.
- `prompt-client.ts` also owns abort-linked request timeouts so cancellation,
  active-request identity, and user feedback remain coordinated in one place.

## Session Pool State

The pool internally tracks:

```text
idle
  -> checking
  -> creating-template
  -> ready
  -> disposed/invalidated
```

Only one template-creation promise may exist. Callers that arrive during
`checking` or `creating-template` await that promise. A successful request marks
the template as used and promotes it to a document-lifetime keeper with no
ordinary idle TTL. A warm-up that is not followed by a request uses the shorter
unused TTL even if the document becomes hidden. Visibility does not add a local
TTL after the template has served a real request.

The pool exposes:

```ts
warmUp(): Promise<WarmUpResult>
acquire(signal: AbortSignal): Promise<AcquiredPromptSession>
scheduleIdleDisposal(): void
handleVisibilityChange(hidden: boolean): void
invalidate(): void
dispose(): void
```

`AcquiredPromptSession.release()` is idempotent and destroys only the request
session. Template disposal remains pool-owned.

Session acquisition clears any pending unused disposal timer before
creating a clone or fallback request session. A successful acquisition promotes
the template to a used keeper; a failed acquisition restores disposal according
to whether the template has served a request. This prevents a short warm-up TTL
from destroying the keeper while request-session creation is still pending.

## Acquisition Algorithm

```text
acquire
  cancel idle disposal
  ensure template
    check cached readiness or availability()
    reject downloadable/downloading/unavailable
    create template with the stable system prompt
  if template.clone exists
    clone with request AbortSignal
  else
    retain template unchanged as the keeper
    create independent request session with the stable system prompt
  return request session and release callback
```

If clone fails with `InvalidStateError`, invalidate the template and retry
template creation plus acquisition once. Other failures are returned without a
speculative rebuild. `QuotaExceededError` immediately invalidates the template
and starts a short backoff. When `clone()` is absent, the clean template remains
an unprompted keeper and every request receives a separately created session.
This costs one additional session but preserves both request isolation and the
model-ready keeper lifecycle.

Any session returned after its caller has already aborted is destroyed
immediately. This late-resolution cleanup applies to template creation, clone,
and fallback creation even when the browser implementation ignores the passed
`AbortSignal`.

Readiness results use bounded in-memory caching:

- `available`: 60 seconds;
- `downloadable`, `downloading`, or `unavailable`: 5 seconds;
- any create or clone failure: invalidate immediately.

## Warm-up Integration

`start-content-app.ts` schedules warm-up after a valid live selection has been
stable for 300 ms. The timer is cancelled when the pending selection disappears
or changes. Warm-up runs only while `document.visibilityState === "visible"`.

Hovering while warm-up is running awaits the same single-flight promise. Hover
does not create a competing template. `downloadable`, `downloading`, API-missing,
unsupported, and quota results are silently retained for the eventual explicit
request to render; warm-up itself does not open UI or download the model.

## Timeouts

Initial defaults:

| Phase | Soft threshold | Hard threshold |
| --- | ---: | ---: |
| Availability | none | 5 seconds |
| Template/request acquisition | 2 seconds | 30 seconds |
| First token | 2 seconds | 30 seconds |
| Stream inactivity | none | 30 seconds |

After 5 seconds without visible output, the card exposes an explicit cancel
action. Closing the card remains an immediate cancellation path at all times.

The acquisition hard timeout covers readiness and template/request-session
creation from the user's request perspective. Internal availability retains its
narrower hard timeout.

Soft thresholds update page-local loading detail. Hard thresholds abort through
the request controller and map to retryable public errors. Timer callbacks must
check request identity so stale timers cannot alter a newer card interaction.

## Render State

The existing public request state remains compatible. Ephemeral view state adds
a loading detail per short and detailed request:

```ts
type PromptLoadingDetail =
  | "dispatching"
  | "acquiring_session"
  | "waiting_response"
  | "response_slow";
```

- immediate request: `dispatching`;
- acquisition soft threshold: `acquiring_session`; copy explains that starting
  or resuming the local model may take time because that work can occur inside
  create/clone;
- session acquired and prompt dispatched: `waiting_response`;
- no first chunk two seconds after dispatch: `response_slow`;
- first chunk: existing streaming UI.

These states describe observed request phases only. They do not replace or infer
the existing Prompt API preparation state. The copy says that starting or
resuming may take time because Chrome exposes no separate loaded-state signal.

No new persistent selection or model data is introduced.

## Performance Events

Development measurements use `performance.now()` and a replaceable sink:

```ts
interface PromptPerformanceEvent {
  phase: "availability" | "template_create" | "clone" | "fallback_create" |
    "acquire" | "first_token" | "visible_wait" | "complete";
  durationMs: number;
  path?: "cold" | "warm" | "fallback";
  mode?: "short" | "detailed";
  prewarmed?: boolean;
  cacheHit?: boolean;
  idleAgeBucket?: "unknown" | "under_1m" | "1m_to_4m" |
    "4m_to_10m" | "over_10m";
  outcome: "success" | "error" | "cancelled" | "timeout";
}
```

The default sink logs one JSON payload per event only when a local debug flag is
enabled. No event includes
text, output, prompt, URL, tab identity, or page identity. Events are not sent
over the network or written to extension storage.

`idleAgeBucket` is a request-start diagnostic based on the previous successful
first chunk in the same document. It is coarse, in-memory only, and never drives
loading copy, timeout behavior, session acquisition, or model preparation.

`visible_wait` measures user dispatch to first visible chunk, while `acquire`
measures session acquisition. Error, cancellation, and timeout paths emit
terminal outcomes even when no content becomes visible.

## Error Mapping

Add retryable error codes for:

- `readiness_timeout`;
- `model_startup_timeout`;
- `first_token_timeout`;
- `stream_stalled`.

Cancellation remains silent for active UI teardown. Timeout errors remain
visible and retryable. Download-required, downloading, unsupported, language,
and quota mappings keep their existing meaning.

## Lifecycle Integration

- used keeper: retain for the current document lifetime without an idle timer,
  including while hidden;
- unused warm-up: release after 15 seconds if no real request consumes it;
- `visibilitychange`: update Worker coordination metadata only;
- successful acquisition: register/touch the page keeper with the Worker;
- extension-level limit: retain at most five registered keepers, evicting the
  least-recently-used hidden page first and then the least-recently-used page;
- Worker restart: restore registry ordering from `chrome.storage.session`;
- LRU eviction: dispose the targeted page pool; its next request recreates it;
- `pagehide`: cancel pending warm-up and dispose the pool.
- SPA document-instance navigation: cancel active requests, pending warm-up, and
  dispose the pool before rotating the page instance.
- card close: cancel request sessions and keep an already-used visible keeper.

## Verification

Automated tests must cover:

- one template create for concurrent warm-up/acquire calls;
- isolated clones and balanced release;
- dedicated keeper plus independent fallback request sessions when clone is
  unavailable;
- template invalidation and one retry after invalid-state clone failure;
- warm-up never calls create when readiness is not `available`;
- visible and hidden keeper retention plus unused-warm-up disposal;
- five-entry LRU coordination, hidden-first eviction, Worker restart recovery,
  stale document replacement, and tab-close cleanup;
- page lifecycle disposal;
- availability, startup, first-token, and stream-stall timeouts;
- stale/cancelled requests do not emit UI content;
- performance events contain no content-bearing fields.
- late-resolving sessions are destroyed after abort;
- quota failures do not trigger clone retries and activate backoff;
- positive and blocked readiness caches obey their TTLs and invalidation rules;
- visible keeper retention, fallback concurrency, warm-up debounce, pending acquisition
  cancellation, and explicit cancel rendering are covered.

Required local gate:

```bash
cd extension
npm ci
npm run check
npm test
npm run build
```

Real Chrome behavioral validation was completed on 2026-08-21 against the exact
production build. Statistical latency claims still require a larger sample
because mocks cannot reproduce Chrome's model-runtime cold start, memory
pressure, or quota.

## Alignment Review

- The Prompt API remains in the Content Script document context.
- The Service Worker coordinates keeper metadata and targeted eviction but does
  not proxy prompts or own Prompt API sessions. The Manifest adds `storage` for
  session-scoped LRU state only.
- Model preparation remains an explicit device-status-page action.
- Request histories remain isolated through clone or independent-create paths.
- Performance diagnosis preserves the documented no-telemetry privacy boundary.

## Change Record

- 2026-08-13: Approved for implementation after the project owner authorized
  the complete latency-optimization plan and the architecture decision was
  recorded in RFC-007.
- 2026-08-13: Updated to retain one used keeper for the visible document
  lifetime, use a 5-minute hidden grace period, and preserve the keeper on the
  no-clone fallback path.
- 2026-08-13: Replaced hidden timeout disposal with document-lifetime retention
  and added a five-keeper, hidden-first extension LRU guard coordinated through
  `chrome.storage.session`.
- 2026-08-21: Validated cold, warm, detailed, cancellation, multi-page, and
  background-recovery behavior in real Chrome and clarified the progressive
  loading stages using only observable Prompt API phases.
