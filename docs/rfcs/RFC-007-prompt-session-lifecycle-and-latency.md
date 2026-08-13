# RFC-007: Prompt Session Lifecycle and Latency

- Status: Accepted
- Related Documents:
  - `docs/product/compatibility.md`
  - `docs/product/productization-validation.md`
  - `docs/discovery/chrome-prompt-api-validation.md`
  - `docs/design/implementation-design/prompt-session-latency-implementation-design.md`

## Context

SnapInsight runs Chrome's Prompt API directly in each page's Content Script.
Chrome owns the downloaded model and its internal model runtime; the extension
owns only `LanguageModelSession` objects created in a document context.

The current request path checks `availability()`, creates a new session with the
system prompt, generates one response, and immediately destroys the session.
That is simple and isolated, but it makes every short explanation, detail
request, and retry pay session-creation cost. It also presents availability
checks, model-runtime wake-up, session creation, and first-token inference as
one undifferentiated loading state.

This change must preserve the following product constraints:

- model download remains Chrome-owned and user-triggered from the device-status
  page;
- selected text, prompts, output, page URLs, and timings are not sent off-device;
- the Manifest V3 Service Worker does not own or proxy Prompt API sessions;
- unrelated pages must not eagerly allocate model sessions on injection;
- different explanation requests must not share conversational history.

## Options

### Option A: Continue creating one independent session per request

Advantages:

- minimal lifecycle complexity;
- strong request isolation;
- resources are released immediately.

Disadvantages:

- repeated session creation remains on every user-visible path;
- short-to-detail transitions cannot reuse initialized system context;
- no opportunity to hide cold-start work in the selection-to-hover interval.

### Option B: Reuse one mutable session for all requests in a page

Advantages:

- lowest number of session creations;
- simple warm-path execution.

Disadvantages:

- Prompt API sessions retain conversational context;
- unrelated selections can influence later explanations;
- cancellation and concurrent short/detail requests become unsafe.

### Option C: Keep a page-scoped template session and clone per request

Advantages:

- preserves request-level context isolation;
- reuses initialization and the stable system prompt where `clone()` is
  supported;
- permits bounded, interaction-driven warm-up;
- retains per-request cancellation and deterministic cleanup.

Disadvantages:

- requires single-flight initialization, idle disposal, and invalidation rules;
- each active page can temporarily hold one template session;
- older implementations without `clone()` require a safe fallback.

### Option D: Move session ownership to the Service Worker

This is not viable. The Prompt API is document-scoped and is not exposed in the
Manifest V3 Service Worker. Worker suspension would also make it the wrong owner
for an interactive model lifecycle.

## Decision

Adopt Option C.

Each Content Script maintains at most one page-scoped template session. The
template contains only the stable SnapInsight system prompt. Each explanation
acquires an isolated request session:

1. clone the healthy template when `clone()` is available;
2. otherwise keep the template untouched as the page's dedicated keeper and
   create an independent request session with the same system prompt for every
   explanation;
3. destroy the request session after completion, cancellation, or failure;
4. after the first real request, retain the template while its document remains
   visible so Chrome can keep the model runtime ready;
5. destroy it on page lifecycle boundaries or invalid-session failures.

Template creation is single-flight. A valid, visible selection may schedule a
debounced warm-up, but Content Script injection alone must never create a
session. Warm-up must not trigger model download: `downloadable` and
`downloading` states remain blocked and direct the user to device status.

The implementation will expose privacy-safe local timing events for development
diagnosis. Events contain phase, duration, path, and mode only. They must never
contain selected text, generated content, prompts, page URL, or other browsing
data, and they are not transmitted or persisted by default.

## Lifecycle Rules

- A template that has served a real request has no ordinary idle TTL while its
  document exists, including while hidden. It acts as the document's dedicated
  keeper.
- A template created only by warm-up gets an unused TTL of 15 seconds so casual
  selections do not retain the model indefinitely.
- Visibility changes update cross-page LRU metadata but do not start a local
  disposal timer for a used keeper.
- The Service Worker coordinates at most five used page keepers. It evicts the
  least-recently-used hidden keeper first, or the least-recently-used keeper if
  all candidates are visible.
- The registry is stored in `chrome.storage.session` across Worker suspension.
  It contains tab/frame runtime ids, a random page instance id, visibility, and
  last-use order only; never URL, title, selected text, prompts, or output.
- `pagehide` and document-instance navigation dispose the pool immediately.
- A new request cancels pending idle disposal.
- An LRU-evicted page can recreate and register a keeper on its next request.
- Quota failures invalidate the template and use a short retry backoff;
  invalid-session clone failures invalidate and rebuild the template once.
- Availability results may be cached briefly, but create/clone failures always
  override cached readiness.
- One automatic template recreation may be attempted for an invalid clone; no
  unbounded automatic retry is allowed.

## Timeout and Feedback Rules

- Availability, session acquisition, first-token wait, and stream inactivity
  use distinct time budgets.
- Soft thresholds update loading feedback without cancelling work.
- Hard thresholds abort the associated operation and surface a retryable error.
- User cancellation, selection replacement, card closure, navigation, and page
  teardown take precedence over timers.

Exact thresholds are initial operational defaults and must be adjustable after
real-device P50/P95 measurement; changing their values does not require a new
architecture RFC.

## Consequences

- Warm sequential explanations should avoid full template creation.
- Long pauses on a surviving document should remain on the warm path because
  the document retains one unprompted keeper unless globally evicted or
  invalidated by Chrome.
- Browser restart can still produce a Chrome model-runtime cold start, but not a
  model re-download unless Chrome reports `downloadable` or `downloading`.
- Multiple tabs can own keepers, bounded to five by extension-level LRU
  coordination. Five is a SnapInsight resource guard, not a documented Chrome
  Session quota.
- The Service Worker remains independent of inference latency and Prompt API
  session objects; it coordinates metadata and targeted eviction only.
- Automated tests must verify balanced create/clone/destroy behavior, timeout
  cancellation, single-flight initialization, and lifecycle cleanup.

## Change Record

- 2026-08-13: Accepted the page-scoped template-session and per-request clone
  architecture for the authorized latency-optimization implementation.
- 2026-08-13: Revised keeper retention after real-device cold-start validation:
  used keepers remain alive while visible, hidden keepers use a 5-minute grace
  period, and no-clone request sessions never consume the keeper.
- 2026-08-13: Replaced hidden-page timeout with document-lifetime retention and
  a five-keeper extension-level LRU guard. Hidden least-recently-used pages are
  evicted first while inference and Session ownership remain page-local.
