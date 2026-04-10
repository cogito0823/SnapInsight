# Extension Origin Validation Runtime Question

## Document Status

- Status: Implemented
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/design/extension-and-local-service-design.md`
  - `docs/specs/api-spec.md`
  - `docs/plans/implementation-plan.md`
  - `docs/plans/project-progress.md`

## 1. Context

`Batch 8` final browser-side verification uncovered a runtime compatibility question around the local API trust boundary.

Current implementation and documentation assume:

- the extension service worker is the only runtime that calls `http://127.0.0.1:11435`
- the local API enforces the trusted extension identity through the incoming `Origin`
- the trusted value is `chrome-extension://<extension-id>`

Observed verification evidence in a real loaded extension environment:

- an unpacked build from `extension/dist` was loaded successfully in Playwright Chromium as extension id `ogainmanhpcodfdgafgpokdoejjlpjah`
- the local API was started with `SNAPINSIGHT_TRUSTED_EXTENSION_ID=ogainmanhpcodfdgafgpokdoejjlpjah`
- direct `curl` calls with `Origin: chrome-extension://ogainmanhpcodfdgafgpokdoejjlpjah` succeeded for both `GET /health` and `GET /v1/models`
- the loaded extension's real runtime calls returned:
  - `health.check -> request_failed`
  - `models.list -> request_failed`
- direct `fetch()` and `XMLHttpRequest` from the extension options page to `http://127.0.0.1:11435/health` both received `403` with `The request origin is not allowed.`

This does not yet prove the same behavior occurs in every Chrome runtime, but it does prove the current trust assumption is not portable enough to treat `Batch 8` as cleanly release-ready yet.

## 2. Resolution

The chosen and implemented direction is the hybrid rule:

- keep the trusted `Origin == chrome-extension://<extension-id>` path
- add a worker-controlled fallback header: `X-SnapInsight-Extension-Id: <chrome.runtime.id>`
- accept the request when either signal matches the configured trusted extension identity

Resolution notes:

- this keeps the service worker as the only supported localhost caller
- it avoids introducing a separate shared secret while still unblocking real-browser runtimes where extension `Origin` behavior is missing or incompatible
- it preserves the existing `403` pre-stream rejection boundary and extension-facing `request_failed` normalization when both trust signals fail

## 3. Immediate Follow-Up

- Update the API, design, and implementation-design documents to reflect the hybrid trust boundary as the new baseline.
- Keep the worker as the only runtime that attaches the fallback header.
- Preserve the direct `curl + Origin` verification path for local debugging and manual checks.
