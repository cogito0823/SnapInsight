# Technical Architecture Questions

## Document Status

- Status: Draft
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/discovery/requirements-scope-questions.md`
  - `docs/discovery/prd-refinement-questions.md`

## Purpose

This discovery document collects the technical questions that must be clarified before writing formal RFCs for SnapInsight.

The goal is to compare viable implementation directions for the first version and record preliminary recommendations. Final decisions should be written into `docs/rfcs/`.

## 1. Extension Runtime Architecture

### 1.1 Where should the selection logic and floating-card UI live?

Options:
- Put both selection detection and card UI inside the content script
- Detect selection in the content script but render UI through extension pages
- Route all interaction through the background service worker

Preliminary recommendation:
- Keep selection detection and in-page UI in the content script.
- Render the floating icon and card inside a Shadow DOM root injected into the page.

Reasoning:
- The interaction happens next to the user's current selection and must respond immediately to page context.
- A content-script-owned UI can read selection geometry directly and manage hover/click transitions with lower latency.
- Shadow DOM reduces CSS collisions with arbitrary websites.

### 1.2 What should the service worker be responsible for?

Options:
- Keep the service worker minimal and let the content script call the local service directly
- Use the service worker as the single broker for local-service requests and settings access
- Move most business logic into the service worker and keep the content script very thin

Preliminary recommendation:
- Use the service worker as the single broker for network requests and shared extension state.
- Keep the content script focused on page interaction and view state.

Reasoning:
- This keeps localhost access policy centralized.
- It reduces duplication if future pages or extension surfaces also need the same APIs.
- It gives one place for request cancellation, timeout policy, and storage-backed settings reads.

### 1.3 Where should model selection and lightweight configuration UI live?

Options:
- Only inside the in-page explanation card
- Only inside an extension options page
- Use the in-page card for quick selection and an options page for persistent settings

Preliminary recommendation:
- Support quick model selection in the card when the user is blocked by first-use setup.
- Add an options page as the stable place for persistent configuration.

Reasoning:
- The PRD requires that first use should not proceed until a model is explicitly chosen.
- Keeping a dedicated options page avoids overloading the in-page card with every setting.

## 2. Local Communication and Security

### 2.1 How should the extension talk to the local Python service?

Options:
- Direct HTTP calls to `http://127.0.0.1:<port>` from the content script
- HTTP calls to `http://127.0.0.1:<port>` routed through the extension service worker
- Chrome Native Messaging

Preliminary recommendation:
- Use HTTP on `127.0.0.1` with requests routed through the extension service worker.

Reasoning:
- HTTP keeps the local service simple to develop, debug, and document.
- It aligns well with a FastAPI-based Python service.
- Native Messaging adds packaging and installation complexity that is unnecessary for v1.

### 2.2 How should the local service exposure be constrained?

Options:
- Bind to all interfaces and rely on a random token
- Bind only to `127.0.0.1` and limit allowed origins
- Bind only to `127.0.0.1` without origin restrictions

Preliminary recommendation:
- Bind only to `127.0.0.1`.
- Explicitly validate the extension origin and reject unexpected origins.

Reasoning:
- The PRD requires that selected text must never be sent to external services.
- Localhost-only binding is the first isolation layer.
- Origin validation adds a second layer against accidental local misuse by unrelated browser pages or tools.

### 2.3 How should port management work in v1?

Options:
- Fixed default port with documentation
- Dynamic port discovery
- Extension-managed local service bootstrap

Preliminary recommendation:
- Use a fixed localhost port in v1 and document it clearly.

Reasoning:
- The project does not yet have an installer or background bootstrap process.
- Fixed-port development is simpler for a document-first v1.

## 3. Python Service and Ollama Integration

### 3.1 What service framework should be used?

Options:
- FastAPI
- Flask
- Bare `http.server` or similar lightweight framework

Preliminary recommendation:
- Use FastAPI.

Reasoning:
- FastAPI fits typed request/response contracts well.
- It supports streaming responses cleanly enough for the PRD's required behavior.
- The project already expressed a preference for FastAPI in discovery.

### 3.2 How should explanation generation be modeled?

Options:
- One endpoint that always returns both short and detailed explanation
- Separate endpoints or modes for short explanation and detailed explanation
- One endpoint with a shared prompt template and a `mode` field

Preliminary recommendation:
- Use a shared explanation endpoint shape with an explicit `mode` field such as `short` or `detailed`.

Reasoning:
- The PRD requires short explanation first and detailed explanation only on explicit user action.
- A shared endpoint contract reduces duplicated validation and error handling.

### 3.3 How should Ollama model discovery work?

Options:
- Hardcode a model name in server config
- Read available models from Ollama on demand and return them to the extension
- Cache models permanently after first read

Preliminary recommendation:
- Read available models from Ollama via the local service and expose them to the extension.
- Use short-lived in-memory caching only as an implementation optimization, not as a product contract.

Reasoning:
- The PRD requires a selectable model list from Ollama.
- The server should remain the adapter layer between extension UI and Ollama details.

### 3.4 How should streaming and cancellation behave?

Options:
- Non-streaming responses only
- Streaming for both short and detailed explanations, with best-effort cancellation
- Streaming only for detailed explanations

Preliminary recommendation:
- Stream both short and detailed explanation text.
- Treat cancellation as best-effort from extension to local service to Ollama.

Reasoning:
- Streaming is a formal PRD requirement.
- Cancellation matters because the user can select a new term or close the card mid-request.

## 4. Cross-Cutting Questions

### 4.1 What should be logged in v1?

Options:
- Full selected text and prompts for debugging
- Only operational metadata and sanitized error details
- No logging at all

Preliminary recommendation:
- Log only operational metadata and sanitized error details by default.
- Do not persist selected text or model outputs in normal operation.

Reasoning:
- The PRD explicitly forbids storing selected text and query history.
- Some operational visibility is still useful for debugging local failures.

### 4.2 How should the repository be structured once implementation starts?

Options:
- Single mixed source tree
- Monorepo-style split between extension and server
- Separate repositories

Preliminary recommendation:
- Keep one repository, but split implementation into clear top-level areas for extension and server.

Reasoning:
- The project is still small and document-driven.
- One repository makes it easier to evolve docs, API contracts, and both runtimes together.

### 4.3 How should streaming API failures be represented?

Options:
- Always use HTTP status codes for generation failures
- Always return `200` and represent every failure with a terminal stream event
- Use HTTP status codes before the stream is established, then use a terminal stream `error` event after the stream is established

Preliminary recommendation:
- Use HTTP status codes only for failures detected before a stream is successfully established.
- Once the response stream has started, represent failures with a terminal `error` event and keep the HTTP status at `200`.

Reasoning:
- This gives callers a stable distinction between transport-level setup failure and in-stream generation failure.
- It avoids conflicting implementations where some failures are emitted as HTTP `500` and others as stream events.
- It matches the product need to preserve already streamed text when a later failure happens.

### 4.4 How should the PRD selection limit relate to the API validation limit?

Options:
- Use the PRD product limit as the only allowed API limit
- Keep a looser defensive API limit while preserving the stricter PRD/UI rule
- Remove the strict UI rule and let the service decide entirely

Preliminary recommendation:
- Keep the PRD rule unchanged: the extension should only initiate explanation requests for selections within the `1-20` product limit.
- Keep a looser API-side defensive validation ceiling for malformed or non-product callers.
- Treat the API ceiling as a guardrail, not as a supported product capability.

Reasoning:
- The PRD defines user-facing behavior, not only backend validation.
- A defensive server-side ceiling is still useful because the local service is a process boundary and should reject obviously invalid payloads.
- Explicitly separating product support from defensive validation prevents future confusion.

### 4.5 How should model-list failures behave when the local service is running but Ollama is unavailable?

Options:
- Return `200` with a special model-list state
- Return an HTTP failure with a stable error body
- Hide the distinction and rely only on `GET /health`

Preliminary recommendation:
- Keep `GET /health` focused on whether the SnapInsight local service is reachable, while also exposing `ollamaReachable` as dependency health context.
- Let `GET /v1/models` remain the source of truth for model availability.
- If Ollama is reachable but no models exist, return `200` with `state: "no_models_available"`.
- If Ollama itself cannot be queried, return `503` with a stable error body using public error code `request_failed`.

Reasoning:
- This cleanly separates service liveness from dependency readiness.
- It allows the extension to show a more accurate setup state without inventing inconsistent special cases in the model-list endpoint.
- It keeps the public error-code surface small while still making the HTTP semantics explicit.

### 4.6 How should explanation streams be routed across multiple tabs or page instances?

Options:
- Route streams only by `requestId`
- Route streams by `requestId` plus sender context such as tab and frame identity
- Keep only one global active explanation request for the whole extension

Preliminary recommendation:
- Route streams by `requestId` plus sender context, including at least the originating tab identity and frame identity where available.
- Treat `requestId` as unique within a page interaction scope, not as the only global routing key.

Reasoning:
- The extension may have multiple tabs or page instances active at the same time.
- Using only `requestId` creates avoidable risk of stream misdelivery or accidental cross-page cancellation.
- Sender context gives the service worker a stable routing boundary for both stream delivery and cancellation.

### 4.7 How should MV3 service worker lifecycle affect streaming design?

Options:
- Ignore lifecycle and treat the service worker as effectively always alive
- Require a long-lived stream bridge that keeps the interaction alive during active requests
- Move streaming entirely out of the service worker

Preliminary recommendation:
- Keep streaming in the service worker, but require a long-lived bridge between the content script and service worker while an explanation request is active.
- Define an explicit failure behavior if the worker is suspended or the bridge is lost: the current UI request should fail cleanly and require user retry.

Reasoning:
- MV3 service workers are not permanently resident.
- The architecture still benefits from keeping localhost access centralized in the worker.
- Making lifecycle behavior explicit prevents hidden assumptions about stream durability.

### 4.8 How should the `1-20` product limit be counted?

Options:
- Count raw Unicode characters only
- Count whitespace-separated tokens only
- Use a hybrid rule: CJK text counted by characters, whitespace-separated Latin text counted by tokens, with trimming and punctuation ignored at the boundary

Preliminary recommendation:
- Use a hybrid product rule for v1:
  - trim leading and trailing whitespace
  - for text containing spaces, count whitespace-separated tokens
  - for contiguous CJK text without spaces, count visible characters
  - ignore leading and trailing punctuation when validating the boundary
- Keep this as a UI/product validation rule rather than an Ollama-side semantic rule.

Reasoning:
- The PRD wording uses `字或词`, which implies mixed-language support rather than a single character metric.
- A hybrid rule matches user expectation better for English words, Chinese terms, and short mixed phrases.
- Making the counting rule explicit avoids different interpretations across implementations.

### 4.9 How should the extension detect wrong-service or port-conflict scenarios on the fixed localhost port?

Options:
- Treat any `200` response on the expected port as valid
- Validate a service identifier in the health response and fail closed if it does not match
- Add a random token handshake in v1

Preliminary recommendation:
- Validate a stable service identifier in the `GET /health` response.
- If the port responds but the identifier does not match SnapInsight, treat the result as a local service conflict and fail closed.

Reasoning:
- A fixed port simplifies v1, but it also makes “wrong process bound to the port” a realistic scenario.
- A stable service identifier is lightweight and easy to document.
- Failing closed is consistent with the project's privacy and security model.

### 4.10 How should wrong-service responses be represented in the public error contract?

Options:
- Reuse `service_unavailable`
- Reuse `request_failed`
- Define a dedicated public error code such as `local_service_conflict`

Preliminary recommendation:
- Define a dedicated public error code `local_service_conflict`.
- Use it when the fixed localhost port responds but does not identify itself as the SnapInsight local service.

Reasoning:
- “No service on the port” and “wrong service on the port” are operationally different conditions.
- A dedicated code helps the extension show a more accurate setup hint and prevents overloading unrelated error buckets.
- This remains consistent with fail-closed behavior.

### 4.11 How should page-instance routing be handled for same-tab navigations or reloads?

Options:
- Use only `tabId` and `frameId`
- Add a per-document `pageInstanceId` generated by the content script
- Keep the route global and cancel all old streams on every navigation

Preliminary recommendation:
- Keep `tabId` and `frameId`, but also require a per-document `pageInstanceId`.
- Generate a fresh `pageInstanceId` whenever a new page document instance is created.

Reasoning:
- `tabId` and `frameId` alone do not distinguish an old page instance from a reloaded or newly navigated page in the same tab/frame.
- A per-document identifier keeps routing deterministic without making the contract browser-dependent.

### 4.12 How should unexpected MV3 bridge loss be surfaced to the UI contract?

Options:
- Leave it as an implicit transport issue
- Surface a dedicated public error code
- Normalize it to a retryable `request_failed` result in the extension-internal contract

Preliminary recommendation:
- Normalize unexpected bridge loss to a retryable `request_failed` result in the extension-internal contract.
- Require the content script to move the affected request into a retryable failed state if the stream bridge disappears unexpectedly.

Reasoning:
- Bridge loss is an extension-runtime issue, not a product-level model or service-state concept.
- A dedicated public code would add complexity without adding much user-facing value in v1.
- A retryable failure path is enough for a clean recovery model.

### 4.13 How should the mixed-language `1-20` counting rule handle edge cases?

Options:
- Keep only a broad hybrid rule
- Define segment-based counting with examples for mixed scripts, hyphenated English, and punctuation
- Move all mixed-script cases to best-effort behavior

Preliminary recommendation:
- Use a segment-based counting rule for v1:
  - trim leading and trailing whitespace
  - strip leading and trailing punctuation from the full selection
  - split remaining text by whitespace into segments
  - for a segment containing only Latin letters, digits, connector punctuation such as `-` and `'`, count it as `1`
  - for a segment containing CJK characters, count each visible CJK character as `1`, and count any contiguous Latin/digit run inside that same segment as `1`
- Document examples such as:
  - `GPT-4` -> `1`
  - `RAG-based agent` -> `2`
  - `AI大模型` -> `5`

Reasoning:
- This keeps English terms intuitive while making mixed-script selections deterministic.
- Examples reduce ambiguity much more effectively than generic prose alone.
- The rule stays lightweight enough for a browser-side validation path.

### 4.14 How should `local_service_conflict` behave across different extension entry points?

Options:
- Only surface `local_service_conflict` from `health.check`
- Allow each entry point to map wrong-service detection differently
- Require every extension entry point that detects wrong-service identity to normalize to `local_service_conflict`

Preliminary recommendation:
- Any extension entry point that detects wrong-service identity on the fixed localhost port must normalize to `local_service_conflict`.
- This includes at least health checks, model-list fetches, and explanation-stream setup.

Reasoning:
- The operational condition is the same regardless of which user flow discovers it first.
- A single public error code avoids inconsistent setup behavior across settings, first-use flow, and explanation requests.

### 4.15 How explicit should the worker-to-content-script streaming event contract be?

Options:
- Only specify that events are forwarded somehow
- Define one explicit internal event envelope with examples for stream chunks and failures
- Leave the exact format to implementation

Preliminary recommendation:
- Define an explicit internal event envelope for worker-to-content-script delivery.
- Include examples for streamed chunks, completion, terminal errors, and unexpected bridge-loss failures.

Reasoning:
- “Forward the API event” is not specific enough to guarantee interoperable implementations.
- The extension boundary is just as important as the localhost API boundary for reliable implementation.

### 4.16 How should the project describe the residual risk of a local process impersonating SnapInsight?

Options:
- Treat service-identity checking as sufficient and omit further discussion
- Record impersonation as an explicit residual v1 risk
- Block v1 until a stronger authentication mechanism is added

Preliminary recommendation:
- Record local-process impersonation as an explicit residual v1 risk.
- Keep the current service-identity check as the v1 mitigation for accidental port conflicts, but not as a full anti-impersonation guarantee.
- If stronger protection is needed later, address it in a dedicated future RFC.

Reasoning:
- The current design detects common wrong-service cases but cannot fully authenticate a local process.
- Writing the residual risk down prevents the current protection from being overstated.

### 4.17 Should `input` / `textarea` anchor-geometry details be finalized now?

Options:
- Fully specify the geometry strategy now
- Record it as a lower-priority follow-up design item
- Drop support from v1

Preliminary recommendation:
- Keep `input` / `textarea` support in v1 as already stated in the PRD.
- Record anchor-geometry details for these elements as a lower-priority follow-up design item rather than fully specifying them in this round.

Reasoning:
- The current review found higher-priority contract and routing issues.
- Deferring geometry detail here avoids blocking the main architecture/spec closure while keeping the product commitment visible.

## 5. Proposed RFC Breakdown

Based on the questions above, the formal RFC set should be:

1. `docs/rfcs/RFC-001-extension-architecture.md`
2. `docs/rfcs/RFC-002-local-communication-and-security.md`
3. `docs/rfcs/RFC-003-python-service-and-ollama-integration.md`

## 6. Discovery Summary

Current preliminary direction for v1:

- Use a Chrome MV3 extension with content-script-owned in-page UI.
- Use the extension service worker as the only broker that talks to the local service.
- Use a FastAPI-based Python service on a fixed localhost port.
- Keep all explanation traffic local and validate extension origin at the service boundary.
- Use a shared explanation API shape with streaming responses and best-effort cancellation.
- Use HTTP status codes only before stream establishment; after streaming starts, failures must end with a terminal `error` event.
- Preserve the PRD's `1-20` product limit in the extension while treating the API's larger text ceiling as defensive validation only.
- Distinguish “service reachable” from “Ollama reachable” by keeping `GET /health` for liveness and `GET /v1/models` for model availability.
- Route explanation streams by both request identity and sender context rather than by `requestId` alone.
- Require an explicit stream-bridge strategy for MV3 service worker lifetime and clean retry behavior on bridge loss.
- Use an explicit hybrid counting rule for the PRD's `1-20` selection boundary.
- Validate the SnapInsight service identity on the fixed localhost port and fail closed on port conflicts or wrong-service responses.
- Represent wrong-service fixed-port responses with a dedicated public error code `local_service_conflict`.
- Extend sender context with a per-document `pageInstanceId` so same-tab navigations cannot receive stale stream events.
- Normalize unexpected MV3 bridge loss to a retryable internal `request_failed` outcome.
- Make the mixed-language `1-20` rule segment-based and anchor it with explicit examples.
- Normalize wrong-service detection to `local_service_conflict` across health, model-list, and stream-setup entry points.
- Define an explicit worker-to-content-script stream event envelope rather than leaving forwarding format implicit.
- Record local-process impersonation as an explicit residual v1 security risk.
- Keep `input` / `textarea` support in v1, but defer detailed anchor-geometry design to a lower-priority follow-up.
