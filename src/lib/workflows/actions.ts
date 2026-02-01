"use server"

import type { ObjectInfo, WorkflowDefinition, WorkflowFileInfo } from "./types"

/**
 * Get the base URL for the ComfyUI API
 * This should be configured via environment variable
 */
function getBaseUrl(): string {
  const baseUrl = process.env.COMFY_API_BASE_URL || "http://localhost:8188"
  return baseUrl
}

/**
 * Fetches the list of workflow files from the ComfyUI userdata API
 *
 * @returns Array of workflow file metadata or error object
 */
export async function getWorkflowList(): Promise<
  { ok: true; data: WorkflowFileInfo[] } | { ok: false; error: string }
> {
  try {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/api/userdata?dir=workflows&recurse=true&split=false&full_info=true`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Always fetch fresh data
    })

    if (!response.ok) {
      return {
        ok: false,
        error: `Failed to fetch workflows: ${response.status} ${response.statusText}`,
      }
    }

    const data = (await response.json()) as WorkflowFileInfo[]

    // Validate the response structure
    if (!Array.isArray(data)) {
      return {
        ok: false,
        error: "Invalid response format: expected an array",
      }
    }

    // Validate each item has the required fields
    for (const item of data) {
      if (
        typeof item.path !== "string" ||
        typeof item.size !== "number" ||
        typeof item.modified !== "number" ||
        typeof item.created !== "number"
      ) {
        return {
          ok: false,
          error: "Invalid workflow file info structure",
        }
      }
    }

    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Fetches a specific workflow definition by its path
 *
 * @param path - The path to the workflow file (e.g., "alpaca.json")
 * @returns Workflow definition or error object
 */
export async function getWorkflowByPath(
  path: string,
): Promise<
  { ok: true; data: WorkflowDefinition } | { ok: false; error: string }
> {
  try {
    if (!path || typeof path !== "string") {
      return {
        ok: false,
        error: "Invalid path: path must be a non-empty string",
      }
    }

    const baseUrl = getBaseUrl()

    const fullPath = `workflows/${path}`
    const encodedPath = encodeURIComponent(fullPath)
    const url = `${baseUrl}/api/userdata/${encodedPath}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Always fetch fresh data
    })

    if (!response.ok) {
      return {
        ok: false,
        error: `Failed to fetch workflow: ${response.status} ${response.statusText}`,
      }
    }

    const data = (await response.json()) as WorkflowDefinition

    // Validate the response structure
    if (
      typeof data.id !== "string" ||
      typeof data.revision !== "number" ||
      typeof data.last_node_id !== "number" ||
      typeof data.last_link_id !== "number" ||
      !Array.isArray(data.nodes) ||
      !Array.isArray(data.links) ||
      !Array.isArray(data.groups) ||
      typeof data.config !== "object" ||
      typeof data.extra !== "object" ||
      typeof data.version !== "number"
    ) {
      return {
        ok: false,
        error: "Invalid workflow definition structure",
      }
    }

    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Fetches all workflows with their complete definitions
 * This combines getWorkflowList and getWorkflowByPath for convenience
 *
 * @returns Array of workflows with metadata and definitions, or error object
 */
export async function getAllWorkflows(): Promise<
  | {
      ok: true
      data: Array<{
        fileInfo: WorkflowFileInfo
        definition: WorkflowDefinition
      }>
    }
  | { ok: false; error: string }
> {
  try {
    const listResult = await getWorkflowList()

    if (!listResult.ok) {
      return { ok: false, error: listResult.error }
    }

    // Fetch all workflow definitions in parallel
    const workflowPromises = listResult.data.map(async (fileInfo) => {
      const definitionResult = await getWorkflowByPath(fileInfo.path)

      if (!definitionResult.ok) {
        throw new Error(
          `Failed to fetch workflow ${fileInfo.path}: ${definitionResult.error}`,
        )
      }

      return {
        fileInfo,
        definition: definitionResult.data,
      }
    })

    const workflows = await Promise.all(workflowPromises)

    return { ok: true, data: workflows }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Fetches the object info (node type definitions) from the ComfyUI API
 * This contains metadata about all available node types including their inputs and outputs
 *
 * @returns Object info with node type definitions or error object
 */
export async function getObjectInfo(): Promise<
  { ok: true; data: ObjectInfo } | { ok: false; error: string }
> {
  try {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/api/object_info`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Always fetch fresh data
    })

    if (!response.ok) {
      return {
        ok: false,
        error: `Failed to fetch object info: ${response.status} ${response.statusText}`,
      }
    }

    const data = (await response.json()) as ObjectInfo

    // Validate the response structure
    if (typeof data !== "object" || data === null) {
      return {
        ok: false,
        error: "Invalid response format: expected an object",
      }
    }

    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Saves a workflow definition to the ComfyUI userdata API
 *
 * @param path - The path to the workflow file (e.g., "alpaca.json")
 * @param workflow - The workflow definition to save
 * @returns Success or error object
 */
export async function saveWorkflow(
  path: string,
  workflow: WorkflowDefinition,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!path || typeof path !== "string") {
      return {
        ok: false,
        error: "Invalid path: path must be a non-empty string",
      }
    }

    const baseUrl = getBaseUrl()
    console.log(`[saveWorkflow] Using base URL: ${baseUrl}`)

    const fullPath = `workflows/${path}`
    const encodedPath = encodeURIComponent(fullPath)
    const url = `${baseUrl}/api/userdata/${encodedPath}?overwrite=true&full_info=true`

    console.log(`[saveWorkflow] Saving to: ${url}`)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "Comfy-User": "",
      },
      body: JSON.stringify(workflow),
      cache: "no-store",
    })

    console.log(
      `[saveWorkflow] Response status: ${response.status} ${response.statusText}`,
    )

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error(`[saveWorkflow] Error response body: ${text}`)
      return {
        ok: false,
        error: `Failed to save workflow: ${response.status} ${response.statusText} ${text}`,
      }
    }

    const responseText = await response.text().catch(() => "")
    console.log(`[saveWorkflow] Success response: ${responseText}`)

    return { ok: true }
  } catch (error) {
    console.error(`[saveWorkflow] Exception:`, error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
