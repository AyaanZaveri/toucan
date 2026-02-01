/**
 * TypeScript types for ComfyUI workflow API responses
 */

/**
 * File metadata from the userdata API list endpoint
 */
export interface WorkflowFileInfo {
  path: string
  size: number
  modified: number
  created: number
}

/**
 * Widget configuration for node inputs
 */
export interface NodeWidget {
  name: string
}

/**
 * Node input definition
 */
export interface NodeInput {
  localized_name: string
  name: string
  type: string
  link: number | null
  widget?: NodeWidget
}

/**
 * Node output definition
 */
export interface NodeOutput {
  localized_name: string
  name: string
  type: string
  links: number[] | null
}

/**
 * Node properties for Search & Replace
 */
export interface NodeProperties {
  "Node name for S&R": string
  [key: string]: unknown
}

/**
 * Individual node in a workflow
 */
export interface WorkflowNode {
  id: number
  type: string
  pos: [number, number]
  size: [number, number]
  flags: Record<string, unknown>
  order: number
  mode: number
  inputs: NodeInput[]
  outputs: NodeOutput[]
  title?: string
  properties: NodeProperties
  widgets_values: unknown[]
}

/**
 * Connection link between nodes
 * Format: [link_id, from_node_id, to_node_id, from_slot_index, to_slot_index, type]
 */
export type WorkflowLink = [number, number, number, number, number, string]

/**
 * Workflow group definition
 */
export interface WorkflowGroup {
  title: string
  bounding: [number, number, number, number]
  color: string
  font_size?: number
  locked?: boolean
}

/**
 * Display settings for the workflow canvas
 */
export interface WorkflowDisplaySettings {
  scale: number
  offset: [number, number]
}

/**
 * Extra metadata for the workflow
 */
export interface WorkflowExtra {
  workflowRendererVersion?: string
  ds?: WorkflowDisplaySettings
  [key: string]: unknown
}

/**
 * Complete workflow definition from the userdata endpoint
 */
export interface WorkflowDefinition {
  id: string
  revision: number
  last_node_id: number
  last_link_id: number
  nodes: WorkflowNode[]
  links: WorkflowLink[]
  groups: WorkflowGroup[]
  config: Record<string, unknown>
  extra: WorkflowExtra
  version: number
}

/**
 * Combined workflow with file metadata
 */
export interface WorkflowWithMetadata {
  fileInfo: WorkflowFileInfo
  definition: WorkflowDefinition
}

/**
 * Object info for a node type from the API
 */
export interface NodeTypeInfo {
  input?: {
    required?: Record<string, unknown>
    optional?: Record<string, unknown>
  }
  input_order?: {
    required?: string[]
    optional?: string[]
  }
  output?: string[]
  output_name?: string[]
  output_tooltips?: (string | null)[]
  category?: string
  description?: string
  display_name?: string | null
  [key: string]: unknown
}

/**
 * Object info response from the API
 */
export interface ObjectInfo {
  [nodeType: string]: NodeTypeInfo
}
