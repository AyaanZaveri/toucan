// HTTP API calls go through Next.js proxy to avoid CORS issues
const DEFAULT_API_BASE = "/comfy";

const API_BASE =
  process.env.NEXT_PUBLIC_COMFY_API_BASE_URL?.trim() || DEFAULT_API_BASE;

// WebSocket connections go directly to ComfyUI (no CORS for WebSocket)
const DEFAULT_WS_BASE = "http://localhost:8188";

const WS_BASE =
  process.env.NEXT_PUBLIC_COMFY_WS_BASE_URL?.trim() || DEFAULT_WS_BASE;

const MAX_RESULTS_WHEN_EMPTY = 60;
const HANDLE_EDGE_OFFSET = 16;

export { API_BASE, WS_BASE, HANDLE_EDGE_OFFSET, MAX_RESULTS_WHEN_EMPTY };
