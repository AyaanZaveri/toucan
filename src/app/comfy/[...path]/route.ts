import { type NextRequest, NextResponse } from "next/server"

// Force dynamic rendering for this route (required for proxying)
export const dynamic = "force-dynamic"

const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL ?? "http://localhost:8188"

// Headers to remove when proxying (hop-by-hop headers)
const HEADERS_TO_REMOVE = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "transfer-encoding",
  "upgrade",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  // Browser-only headers that shouldn't be forwarded
  "origin",
  "referer",
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-gpc",
])

/**
 * Build the upstream path, handling special cases like ComfyUI's userdata endpoint
 * that expects %2F-encoded folder separators in a single path segment
 *
 * Note: Our Next route is /comfy/[...path], so pathSegments includes everything after /comfy
 * Example: /comfy/api/userdata/workflows%2Falpaca.json
 * becomes: ["api", "userdata", "workflows/alpaca.json"] (Next decodes %2F)
 */
function buildUpstreamPath(pathSegments: string[]): string {
  if (pathSegments.length === 0) return ""

  // Handle: POST /api/userdata/{file}
  // ComfyUI expects {file} as ONE segment, with folders encoded as %2F
  if (pathSegments[0] === "api" && pathSegments[1] === "userdata") {
    // Everything after /api/userdata may be:
    // - ["workflows%2Falpaca.json"] (ideal)
    // - ["workflows/alpaca.json"] (Next decoded %2F into / inside one string)
    // - ["workflows", "alpaca.json"] (some routers split segments)
    const rawFile = pathSegments.slice(2).join("/")

    // If it already contains %2F (case-insensitive), keep it as-is
    // Otherwise, encode it so slashes become %2F
    const fileSegment = /%2f/i.test(rawFile)
      ? rawFile
      : encodeURIComponent(rawFile)

    return `api/userdata/${fileSegment}`
  }

  // Everything else: forward exactly as received
  return pathSegments.join("/")
}

async function forward(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const params = await context.params
    const pathSegments = params.path || []
    const upstreamPath = buildUpstreamPath(pathSegments)
    const upstreamUrl = `${COMFYUI_BASE_URL}/${upstreamPath}${req.nextUrl.search}`

    console.log(`[ComfyUI Proxy] ${req.method} ${upstreamUrl}`)
    console.log(`[ComfyUI Proxy] Original segments:`, pathSegments)
    console.log(`[ComfyUI Proxy] Built path:`, upstreamPath)

    // Prepare headers for upstream request
    const upstreamHeaders = new Headers()
    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase()
      if (!HEADERS_TO_REMOVE.has(lowerKey)) {
        upstreamHeaders.set(key, value)
      }
    })

    // Prepare body for upstream request
    let body: ArrayBuffer | undefined
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.arrayBuffer()
    }

    // Make upstream request
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body,
    })

    console.log(
      `[ComfyUI Proxy] Response: ${upstreamRes.status} ${upstreamRes.statusText}`,
    )

    // Prepare response headers
    const responseHeaders = new Headers()
    upstreamRes.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase()
      if (!HEADERS_TO_REMOVE.has(lowerKey)) {
        responseHeaders.set(key, value)
      }
    })

    // Return response
    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("[ComfyUI Proxy] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to proxy request to ComfyUI",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(req, context)
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(req, context)
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(req, context)
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(req, context)
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(req, context)
}

export async function OPTIONS(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(req, context)
}
