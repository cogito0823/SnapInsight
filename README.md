# SnapInsight

SnapInsight is a Chrome extension that provides instant, layered explanations for selected text through a lightweight in-page hover interaction. All explanation requests stay on the local machine through a FastAPI service that calls Ollama.

## What It Looks Like

![SnapInsight in-page card example](docs/assets/readme-in-page-card.png)

The current in-page experience is:

- Select a short `1-20` unit text snippet on a normal webpage
- Hover the `SI` trigger near the selection
- Read a streamed short explanation first
- Click `查看更多` to expand a streamed detailed explanation in the same card
- Use the small regenerate icons in the short/detail sections to re-run generation

## Prerequisites

- Chrome desktop browser
- Node.js and npm
- Python 3.11+
- Ollama running locally on `127.0.0.1:11434`
- At least one Ollama model installed, for example `llama3.1:8b`

## Local Setup

### 1. Install extension dependencies

```bash
cd extension
npm install
```

### 2. Create the project-local Python environment

```bash
cd /path/to/SnapInsight
python3 -m venv .venv
source .venv/bin/activate
pip install -e ./server pytest
```

### 3. Make sure Ollama is ready

Example:

```bash
ollama serve
ollama pull llama3.1:8b
```

## Build And Load The Extension

### 1. Build the extension bundle

```bash
cd extension
npm run build
```

### 2. Load the unpacked extension

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select `extension/dist`
5. Copy the generated extension ID

The local API validates the configured extension identity, so you need that ID before starting the server.

## Run The Local API

From the repository root:

```bash
source .venv/bin/activate
cd server
SNAPINSIGHT_TRUSTED_EXTENSION_ID=<your-extension-id> python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 11435
```

You can also provide `SNAPINSIGHT_TRUSTED_EXTENSION_ORIGIN=chrome-extension://<your-extension-id>` instead of the ID-only variable.

## First-Run Flow

When no model has been saved yet:

1. Load the extension and start the local API
2. Open a normal webpage and select a short text snippet
3. Hover the trigger to open the card
4. Choose an available Ollama model inside the card and save it
5. Wait for the short explanation to stream, then optionally expand the detailed explanation

## Quick Verification

1. Open any normal webpage.
2. Select a short `1-20` unit text snippet.
3. Hover the SnapInsight trigger.
4. Confirm the card streams a short explanation.
5. Confirm the original page selection remains visible after the card opens.
6. Click the short-section regenerate icon and confirm the short explanation can be regenerated.
7. Click `查看更多` and confirm the detailed explanation expands inside the same card.
8. While the detailed explanation is still streaming, scroll inside the card and confirm the scrolling remains usable.
9. Click the detail-section regenerate icon and confirm the detailed explanation can be regenerated.
10. Open the extension options page and confirm model selection loads and saves successfully.

## Development Commands

### Extension

```bash
cd extension
npm test
npm run check
npm run build
```

### Server

```bash
cd /path/to/SnapInsight/server
source ../.venv/bin/activate
pytest
```
