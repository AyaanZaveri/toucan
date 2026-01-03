# Toucan + Backend Integration Notes

This document summarizes how the backend serves frontends, how to run Toucan
locally, and the available API surface.

## Local dev setup (recommended)

1) Start backend with CORS enabled so browser requests and WebSocket connections
from the Toucan dev server work:

```bash
cd ../backend
python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header http://localhost:3000
```

2) Start Toucan:

```bash
cd ../toucan
npm run dev
```

3) Use these endpoints:
- HTTP base: `http://127.0.0.1:8188`
- WebSocket: `ws://127.0.0.1:8188/ws`

Key WebSocket rules:
- Connect with `?clientId=<your-id>`.
- Include the same `client_id` in `POST /prompt` (inside `extra_data`).
- Optionally send a first WS message to negotiate features:
  `{ "type": "feature_flags", "data": { "supports_preview_metadata": true } }`.

## How the backend serves the frontend

The backend never imports the frontend repo directly. It serves a compiled
static bundle from a "web root" determined at startup:

- Default: a Python package `comfyui-frontend-package` installed via
  `../backend/requirements.txt`. The backend loads `comfyui_frontend_package`
  and serves the `static/` directory inside the package.
- Remote release: `--front-end-version owner/repo@version` downloads `dist.zip`
  from GitHub Releases and extracts to `../backend/web_custom_versions/...`,
  which becomes the web root.
- Local override: `--front-end-root /path/to/build` points directly at a local
  static build folder. This is the simplest path for local dev builds.

## API surface (HTTP)

Core routes (from `../backend/server.py`):
- `GET /features`
- `GET /system_stats`
- `GET /prompt`
- `GET /queue`, `POST /queue`
- `GET /history`, `GET /history/{prompt_id}`, `POST /history`
- `POST /prompt`
- `POST /interrupt`
- `POST /free`
- `GET /object_info`, `GET /object_info/{node_class}`
- `GET /models`, `GET /models/{folder}`
- `GET /embeddings`
- `POST /upload/image`, `POST /upload/mask`
- `GET /view`, `GET /view_metadata/{folder_name}`
- `GET /extensions`
- `GET /api/jobs`, `GET /api/jobs/{job_id}`

Most routes are also available under `/api/*` because the backend mirrors
non-static routes with an `/api` prefix for dev-server proxying.

User + settings (from `../backend/app/user_manager.py`,
`../backend/app/app_settings.py`):
- `GET /users`, `POST /users`
- `GET /settings`, `GET /settings/{id}`, `POST /settings`, `POST /settings/{id}`
- `GET /userdata`, `GET /v2/userdata`
- `GET /userdata/{file}`, `POST /userdata/{file}`, `DELETE /userdata/{file}`
- `POST /userdata/{file}/move/{dest}`

Custom nodes + i18n (from `../backend/app/custom_node_manager.py`):
- `GET /workflow_templates`
- `GET /i18n`

Subgraphs (from `../backend/app/subgraph_manager.py`):
- `GET /global_subgraphs`
- `GET /global_subgraphs/{id}`

Internal (frontend-only, not stable):
- `/internal/logs`, `/internal/logs/raw`, `/internal/logs/subscribe`
- `/internal/folder_paths`
- `/internal/files/{directory_type}`

## WebSocket events (server -> client)

JSON events:
- `status`
- `executing`
- `executed`
- `execution_start`
- `execution_cached`
- `execution_error`
- `execution_interrupted`
- `progress`
- `progress_state`
- `logs`

Binary events (from `../backend/protocol.py`):
- `PREVIEW_IMAGE`
- `UNENCODED_PREVIEW_IMAGE`
- `TEXT`
- `PREVIEW_IMAGE_WITH_METADATA`
