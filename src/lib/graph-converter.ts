import type { Edge, Node } from "@xyflow/react"
import {
  convertWorkflowToFlow,
  type WorkflowNodeData,
} from "./workflows/converter"
import type { WorkflowDefinition } from "./workflows/types"

/**
 * Data structure for different node types
 */
export interface BaseNodeData {
  label: string
  [key: string]: unknown
}

export interface SettingsNodeData extends BaseNodeData {
  settings: Array<{ label: string; value: string }>
}

export interface PromptNodeData extends BaseNodeData {
  prompt: string
}

/**
 * Parse JSON and convert to ReactFlow format
 * Supports two formats:
 * - Format A: React Flow native { nodes: [], edges: [] }
 * - Format B: Custom workflow format (ComfyUI)
 */
export function parseJsonToReactFlow(
  jsonString: string,
): { nodes: Node<WorkflowNodeData>[]; edges: Edge[] } | { error: string } {
  try {
    const parsed = JSON.parse(jsonString)

    // Format A: React Flow native format
    if (parsed.nodes && parsed.edges) {
      return {
        nodes: parsed.nodes,
        edges: parsed.edges,
      }
    }

    // Format B: Custom workflow format (ComfyUI)
    // Check if it has the workflow structure
    if (parsed.nodes && Array.isArray(parsed.nodes)) {
      // Try to convert as WorkflowDefinition
      const result = convertWorkflowToFlow(parsed as WorkflowDefinition)
      return result
    }

    // If we can't determine the format, return error
    return {
      error:
        "Unrecognized JSON format. Expected either ReactFlow or ComfyUI workflow format.",
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to parse JSON",
    }
  }
}

/**
 * Determine node type based on data structure
 */
export function determineNodeType(node: Node): string {
  if (!node.data) return "default"

  // Check for settings node
  if ("settings" in node.data && Array.isArray(node.data.settings)) {
    return "settings"
  }

  // Check for prompt node
  if ("prompt" in node.data && typeof node.data.prompt === "string") {
    return "prompt"
  }

  // Check for custom type
  if (node.type) {
    return node.type
  }

  return "default"
}
