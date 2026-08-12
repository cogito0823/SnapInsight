# Chrome Prompt API Validation

## Status

- Date: 2026-08-13
- Scope: rapid feasibility spike; the Ollama path remains the default
- Code-level result: passed
- Current-machine runtime result: passed in a user-installed, real Chrome session

## What Was Added

- A build-time inference switch. `ollama` remains the default and `chrome-prompt` enables the experiment.
- An offscreen extension-document host for `LanguageModel` because the Prompt API is not available in the Manifest V3 service worker.
- A worker-side async event queue that adapts Prompt API streaming into the existing SnapInsight `start`, `chunk`, `complete`, and `error` contract.
- Cancellation through `AbortController` and session disposal through `destroy()`.
- A Prompt API Lab page that uses a direct user click to prepare the model, reports download progress, and runs one English and one Chinese explanation case.
- Focused tests for streamed event forwarding and the unsupported-device path.

## Build And Run

```bash
cd extension
npm run build:prompt
```

Load `extension/dist` as an unpacked extension, open its options page, and select `打开 Prompt API Lab`.

The lab deliberately omits `expectedInputs` and `expectedOutputs` language declarations so it can probe current real-world Chinese behavior. This is experimental only: Chrome's documented Prompt API language set does not currently include Chinese.

## Verification Evidence

- `npm run check`: passed
- `npm test`: 44 passed, 0 failed
- Default production build: passed
- Prompt experiment production build: passed
- Prompt API Lab loaded successfully in real Chrome
- `LanguageModel.availability()`: returned `downloadable`
- Model preparation reached 100% and session creation succeeded
- English generation: 10,780 ms; returned a correct, concise explanation of retrieval-augmented generation
- Chinese generation: 2,096 ms; returned fluent Chinese explaining retrieval, external context, and hallucination reduction
- The lab itself produced no warning or error. The only console error came from an unrelated installed Chrome extension (`gcjikeldobhnaglcoaejmdlmbienoocg`).

### Unpacked Extension End-to-End Run

- Loaded `extension/dist` as an unpacked extension in real Chrome.
- Selected Chinese text on an ordinary `http://127.0.0.1` page; the `SI` trigger appeared at the selection anchor.
- Hovering the trigger opened the SnapInsight card and started a short explanation through the Prompt API offscreen host.
- The short Chinese explanation streamed into the existing card and completed successfully without Ollama.
- Selecting `查看更多` started the detailed explanation; partial Chinese output was visibly rendered within 500 ms and the response completed in about 5 seconds.
- Closing the card during another active stream removed the card immediately and produced no SnapInsight warning or error, validating the UI-to-worker cancellation path.
- Output quality was fluent, but a short fragment without surrounding context caused the model to explain the fragment literally. Production prompting should include nearby page context when available.

An earlier run in the app's embedded browser returned `unavailable` with `NotSupportedError: The device is not eligible for running on-device model.` The real Chrome retry demonstrates that this was a browser/runtime eligibility difference rather than a SnapInsight implementation failure.

## Remaining Risks

- Chrome formally documents English, Japanese, Spanish, German, and French for the current Prompt API; Chinese remains unsupported by contract.
- Prompt API cannot run in the Manifest V3 service worker. This spike uses an Offscreen Document with the `WORKERS` reason to establish an extension document. That is suitable for feasibility testing, but its Chrome Web Store review semantics must be resolved before production release because there is no dedicated built-in-AI offscreen reason.
- First model preparation requires a user activation. The lab supplies that activation; the current hover-only card trigger does not.
- The current options surface still contains Ollama settings because this spike intentionally avoids a full product migration.
- Real multi-tab behavior, service-worker restart recovery, model hot-swap behavior, and first-run download behavior on additional devices still require browser testing.

## Go / No-Go Rule

The feasibility gate is passed, but do not replace the Ollama path yet. Compare these results against the existing Ollama baseline and validate the extension-document lifecycle in the unpacked extension. Proceed only if target-language quality, first-token latency, supported-device coverage, and lifecycle behavior are acceptable.

## 2026-08-13 Follow-up

The later productization pass replaced this spike architecture. A real Chrome probe confirmed that `LanguageModel` is exposed in the Content Script isolated world (`availability()` returned `available`, and `create()` plus `prompt()` returned the expected result) while remaining absent from the page's main world. Production code now runs Prompt API sessions directly in the Content Script and no longer uses Offscreen Document or the `WORKERS` reason. The sections above remain as the historical spike record.
