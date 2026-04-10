# SnapInsight

SnapInsight is a Chrome extension that provides instant, layered explanations for selected text through a lightweight in-page hover interaction. All explanation requests stay on the local machine through a FastAPI service that calls Ollama.

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

The local API only trusts requests from the configured extension origin, so you need that ID before starting the server.

## Run The Local API

From the repository root:

```bash
source .venv/bin/activate
cd server
SNAPINSIGHT_TRUSTED_EXTENSION_ID=<your-extension-id> python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 11435
```

You can also provide `SNAPINSIGHT_TRUSTED_EXTENSION_ORIGIN=chrome-extension://<your-extension-id>` instead of the ID-only variable.

## Quick Verification

1. Open any normal webpage.
2. Select a short `1-20` unit text snippet.
3. Hover the SnapInsight trigger.
4. Confirm the card streams a short explanation.
5. Click `查看更多` and confirm the detailed explanation expands inside the same card.
6. Open the extension options page and confirm model selection loads and saves successfully.

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
