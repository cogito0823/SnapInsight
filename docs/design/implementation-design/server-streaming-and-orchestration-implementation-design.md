# SnapInsight Server Streaming and Orchestration Implementation Design

## Document Status

- Status: Approved
- Project-Owner Sign-Off: Completed
- Related Documents:
  - `docs/design/extension-and-local-service-design.md`
  - `docs/design/repository-and-code-structure.md`
  - `docs/specs/api-spec.md`
  - `docs/specs/extension-state-spec.md`
  - `docs/plans/implementation-plan.md`

## 1. Purpose

This document provides implementation-level design guidance for the local Python service in SnapInsight v1.

It explains how the server-side implementation should be structured for:

- FastAPI route handling
- model-catalog access
- streamed explanation orchestration
- Ollama integration
- transport-safe error mapping

This document does not redefine the public API. It translates the approved API, design, and repository-boundary decisions into code-level implementation guidance.

## 2. Scope

In scope:

- FastAPI app structure
- `GET /health`
- `GET /v1/models`
- `POST /v1/explanations/stream`
- server-side request validation boundaries
- explanation orchestration and streaming event production
- Ollama adapter responsibilities
- cancellation and disconnect handling
- transport-safe error mapping

Out of scope:

- extension-side worker behavior
- content-script UI behavior
- persistent history or storage beyond runtime needs
- non-local providers beyond Ollama

## 3. Design Goals

- Keep FastAPI routes thin and transport-focused.
- Keep product rules, model validation, and stream orchestration in services.
- Keep Ollama-specific transport and payload details inside adapters.
- Preserve the API contract's distinction between pre-stream HTTP failure and post-start terminal stream `error`.
- Make wrong-dependency, unavailable-model, and retryable failure cases deterministic.

## 4. Suggested File Layout

Recommended initial file layout:

```text
server/
  app/
    main.py
    api/
      health.py
      models.py
      explanations.py
    services/
      health_service.py
      model_catalog_service.py
      explanation_service.py
      cancellation_service.py
      prompt_service.py
      stream_event_service.py
    adapters/
      ollama_client.py
      ollama_stream_parser.py
    schemas/
      health_schema.py
      model_schema.py
      explanation_schema.py
      error_schema.py
      stream_event_schema.py
    core/
      config.py
      errors.py
      logging.py
      origin_validation.py
```

These file names are recommendations. The critical requirement is to keep route, service, adapter, schema, and core concerns separate.

## 5. Ownership Boundaries

### 5.1 API Layer Responsibilities

The API layer owns:

- FastAPI route declaration
- request parsing and schema validation
- allowed-origin enforcement
- converting service results into HTTP responses or NDJSON stream output

The API layer should not own:

- prompt construction details
- raw Ollama transport logic
- product error remapping logic scattered across routes

### 5.2 Service Layer Responsibilities

The service layer owns:

- health interpretation
- model-catalog interpretation
- explanation request orchestration
- selected-model availability validation
- stream event sequencing
- cancellation and disconnect response

The service layer should not own:

- direct FastAPI response construction
- raw adapter payload schemas

### 5.3 Adapter Layer Responsibilities

The adapter layer owns:

- Ollama endpoint and payload details
- Ollama response parsing
- upstream streaming token iteration
- low-level upstream failure translation into internal server errors

The adapter layer should not leak:

- raw Ollama response bodies into extension-facing contracts
- framework exceptions as the public contract

## 6. Server Submodule Design

### 6.1 `main.py`

`main.py` should:

- create the FastAPI app
- register routers
- apply origin and middleware setup
- load config from `core/config.py`

It should not:

- contain route logic inline
- construct prompt text
- implement stream orchestration directly

### 6.2 API Route Modules

Recommended route split:

- `api/health.py`
- `api/models.py`
- `api/explanations.py`

Route responsibilities:

- validate request body shape with schema models
- call exactly one service entrypoint for the main behavior
- convert service outputs into:
  - JSON success response
  - JSON error response
  - NDJSON stream response

### 6.3 Service Modules

Recommended service split:

- `health_service.py`
- `model_catalog_service.py`
- `explanation_service.py`
- `cancellation_service.py`
- optional `prompt_service.py`
- optional `stream_event_service.py`

Service responsibilities:

- keep orchestration logic explicit and testable
- distinguish business conditions from transport formatting
- return transport-friendly results that the route layer can serialize

### 6.4 Adapter Modules

Recommended adapter split:

- `ollama_client.py` for non-stream and stream requests
- optional `ollama_stream_parser.py` if stream parsing is complex enough to deserve isolation

The adapter should normalize:

- connection failure
- timeout
- upstream malformed response
- upstream stream interruption

into internal service-level exceptions or result types rather than raw framework failures.

## 7. Core Route Flows

### 7.1 `GET /health`

Flow:

1. route calls `health_service`
2. health service determines whether the local SnapInsight service is alive enough to respond
3. health service probes Ollama reachability only as dependency context
4. route returns:
   - `200 OK`
   - `status = "ok"`
   - `service = "snapinsight-local-api"`
   - `version = "v1"`
   - `ollamaReachable = boolean`

Rules:

- `GET /health` is the source of truth for local-service reachability
- `ollamaReachable` does not replace `GET /v1/models` for model availability decisions

### 7.2 `GET /v1/models`

Flow:

1. route calls `model_catalog_service`
2. service asks the Ollama adapter for current models
3. service transforms adapter output into stable SnapInsight model summaries
4. service distinguishes:
   - models available
   - no models available
   - Ollama currently unavailable
   - unexpected retryable failure

Rules:

- no-models is a valid `200` outcome
- Ollama unavailable becomes `503` with `request_failed`
- raw Ollama payloads must not be forwarded directly

### 7.3 `POST /v1/explanations/stream`

Flow:

1. route validates request body
2. route validates allowed origin
3. route calls `explanation_service` for startup checks
4. if startup fails before stream establishment, route returns JSON error with the correct HTTP status
5. if startup succeeds, route starts an NDJSON stream
6. stream emits:
   - exactly one `start`
   - zero or more `chunk`
   - exactly one terminal event: `complete` or `error`

Rules:

- once `200 OK` streaming has begun, later failures must become terminal stream `error`
- the route must not switch to a new HTTP status after stream establishment

## 8. Explanation Orchestration Design

### 8.1 Startup Validation

Before the NDJSON stream begins, the explanation service should validate:

- `requestId` is non-empty
- `text` is non-empty after trim
- `text` does not exceed the defensive API ceiling
- `model` is non-empty
- `mode` is either `short` or `detailed`
- the selected model is currently available
- the required upstream dependency is reachable enough to attempt generation

Recommended failure mapping before stream start:

- invalid payload -> `400` with `invalid_request`
- origin not allowed -> `403`
- no selectable model exists for explanation startup -> `409` with `selected_model_unavailable`
- selected model unavailable -> `409` with `selected_model_unavailable`
- required upstream dependency unavailable -> `503` with `request_failed`
- unexpected startup failure -> `500` with `request_failed`

Startup interpretation rule:

- for `POST /v1/explanations/stream`, "no selectable model exists at all" and "the requested or previously selected model is stale" should converge to the same public startup outcome: `409` with `selected_model_unavailable`
- this differs from `GET /v1/models`, where an empty catalog remains a valid `200` response with `state: "no_models_available"`

### 8.2 Prompt Construction

Prompt construction should live in the service layer, not in the API layer and not in the extension.

Prompt rules:

- short mode should aim for concise, Chinese-first output aligned with the PRD
- detailed mode should prioritize fuller definition, background, usage scenarios, and examples
- prompt construction should remain internal and replaceable without changing the public API contract

### 8.3 Stream Event Production

Once streaming starts, the orchestrator should:

1. emit one `start` event containing `requestId`, `mode`, and `model`
2. consume upstream token chunks from the Ollama adapter
3. convert tokens into ordered `chunk` events
4. emit `complete` when generation finishes successfully
5. emit terminal `error` if a post-start failure occurs

Rules:

- event ordering must be preserved
- no events may follow `complete`
- no events may follow `error`
- if no token was produced before a post-start failure, the terminal `error` still belongs inside the stream once `start` was emitted

### 8.4 Cancellation and Disconnect Handling

The explanation service should stop work early when:

- the client disconnects
- the route is cancelled
- explicit cancellation support is wired later and reaches the running stream

Rules:

- stopping early is best-effort
- user-driven disconnect does not require exposing Python stack traces or raw transport details
- explicit surfaced cancellation is optional; if emitted, it must align with the documented public code `request_cancelled`
- v1 does not require a separate public cancel route; disconnect-aware stream teardown is sufficient unless a later document adds an explicit cancellation contract

## 9. Error Mapping Strategy

Server code should centralize internal-to-public error mapping.

Recommended internal categories:

- `InvalidRequestError`
- `OriginNotAllowedError`
- `SelectedModelUnavailableError`
- `NoModelsAvailableState`
- `UpstreamUnavailableError`
- `UnexpectedServiceError`
- optional `RequestCancelledInternal`

Recommended public mapping:

| Internal condition | HTTP / stream outcome |
| --- | --- |
| invalid request | `400` + `invalid_request` |
| origin not allowed | `403` |
| no selectable model exists before explanation stream | `409` + `selected_model_unavailable` |
| selected model unavailable before stream | `409` + `selected_model_unavailable` |
| no models available during model-list request | `200` + `state: "no_models_available"` |
| upstream unavailable during model-list request | `503` + `request_failed` |
| upstream unavailable before explanation stream starts | `503` + `request_failed` |
| post-start generation failure | terminal stream `error` |
| unexpected server failure before stream | `500` + `request_failed` |

Rules:

- raw stack traces must never become public `message`
- more internal errors may exist, but they must map into the documented public contract

### 9.1 Privacy and Logging Guidance

The server implementation should carry forward the approved privacy and logging rules from `docs/specs/api-spec.md`.

Rules:

- selected text and generated explanation output must not be written to normal operational logs
- request logging should avoid storing raw explanation payload bodies by default
- error logs may capture normalized categories and operational context, but should avoid raw selected text, generated output, or upstream bodies unless an explicitly opt-in debug mode is enabled
- temporary debug logging, if enabled during development, should be opt-in and disabled by default

## 10. Default Implementation Decisions

Unless a later document changes the direction, prefer the following defaults:

- keep one route module per public endpoint
- keep request and response schema models transport-oriented and out of orchestration internals
- keep prompt construction in service helpers rather than route files or adapter files
- keep NDJSON event emission centralized in one helper or generator path
- treat client disconnect as the default v1 cancellation signal for in-flight explanation work

## 11. Origin Validation Design

Allowed-origin validation should be centralized in `core/origin_validation.py` or an equivalent shared module.

Rules:

- the service must only trust allowed `chrome-extension://<extension-id>` origins
- origin rejection for explanation streaming should happen before stream establishment
- origin validation should not be reimplemented separately in each route

### 11.1 Configuration Source

The trusted extension origin should come from server configuration loaded through `core/config.py`.

Recommended rule:

- prefer one explicit configured value that represents the allowed extension identity for the current environment, either as the full trusted origin or as an extension id that `origin_validation.py` converts into `chrome-extension://<extension-id>`
- application startup should fail closed if the trusted extension identity is missing, malformed, or incompatible with the origin-validation helper
- route handlers should consume the centralized validated configuration rather than reconstructing allowlist values ad hoc
- the exact packaging or build mechanism that keeps the extension id stable may remain an implementation detail, but the server-side trust decision must still come from explicit configuration rather than an undocumented constant

## 12. Streaming Implementation Notes

### 12.1 NDJSON Writer

The route layer should use one NDJSON writer helper or generator pattern that:

- serializes one event per line
- flushes incrementally
- preserves event ordering
- avoids double-encoding event payloads

### 12.2 Adapter Stream Consumption

The Ollama adapter should return an iterator or async iterator that the explanation service can consume progressively.

The service should remain responsible for:

- start-event timing
- public chunk-event shape
- terminal-event decision

### 12.3 Coalescing

Server-side chunk coalescing is optional.

If implemented:

- it must not break progressive output perception
- it must not reorder text
- it must not alter terminal-event semantics

## 13. Model Catalog Design

The model catalog service should:

- call the Ollama adapter for installed or available models
- normalize each model into:
  - `id`
  - `label`
  - `provider`
  - `available`

Rules:

- `provider` is fixed to `ollama` in v1
- unavailable or malformed upstream entries should not leak directly to the extension contract
- model validation for explanation startup and selected-model updates should reuse the same catalog interpretation rules where practical

## 14. Implementation Order Inside This Area

Recommended order:

1. scaffold FastAPI app and router registration
2. implement shared core config, logging, and error primitives
3. implement origin validation
4. implement `GET /health`
5. implement model-catalog service and `GET /v1/models`
6. implement request and stream schema models
7. implement Ollama adapter non-stream request path
8. implement explanation-service startup validation
9. implement NDJSON writer and explanation stream route
10. implement disconnect and cancellation handling refinements

This order keeps deterministic JSON routes stable before streaming complexity is added.

## 15. Verification Guidance

Minimum focused checks for this implementation area:

- `GET /health` returns the fixed service identity and `ollamaReachable`
- `GET /v1/models` distinguishes ready, no-models, and retryable upstream failure
- `POST /v1/explanations/stream` validates payload shape before stream establishment
- disallowed origin is rejected before stream establishment
- successful explanation stream emits `start`, ordered `chunk` events, and one terminal event
- pre-stream failures return HTTP error responses rather than partial NDJSON streams
- post-start failures remain terminal stream `error` events rather than changed HTTP status
- selected-model unavailability before stream establishment maps to the documented conflict outcome
- raw Ollama failures do not leak directly into public messages

## 16. Out-of-Scope Decisions Deferred to Later Implementation Designs

The following topics should be covered elsewhere:

- worker-side local API and settings orchestration
- content-script interaction and card-state behavior
- options-page UI structure

## 17. Change Record

- Initial implementation-level design for the local Python service streaming and orchestration area.
- Clarified the v1 disconnect-driven cancellation default and recorded default server implementation decisions for route, schema, prompt, and NDJSON responsibilities.
- Promoted the document to `In Review` after the contract-alignment pass found no remaining substantive conflicts with the approved design and spec documents.
- Clarified the startup mapping for "no selectable model exists" versus "selected model unavailable" and added the extension-state spec to the related-document set for cross-runtime review traceability.
- Marked the document as ready for project-owner approval review after the formal review and follow-up re-review found no remaining substantive findings.
- Added explicit server-side privacy/logging guidance and origin-validation configuration-source guidance so implementation can fail closed without re-deriving trust rules during coding.
- Marked the document `Approved` after project-owner sign-off confirmed it as the execution baseline for server implementation.
