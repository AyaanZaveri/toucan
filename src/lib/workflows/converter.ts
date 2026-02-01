import type { Edge, Node } from "@xyflow/react"
import type { WorkflowDefinition, WorkflowNode } from "./types"

/**
 * Custom data type for workflow nodes in React Flow
 */
export interface WorkflowNodeData extends Record<string, unknown> {
  label: string
  type: string
  inputs: Array<{
    name: string
    type: string
    widget?: { name: string }
    link?: number | null
  }>
  outputs: Array<{ name: string; type: string }>
  widgetValues: unknown[]
  properties: Record<string, unknown>
}

/**
 * Union type for all node types in the workflow visualization
 */
export type WorkflowFlowNode = Node<WorkflowNodeData, "workflow">

/**
 * Converts a ComfyUI workflow node to a React Flow node
 */
function convertNodeToFlowNode(node: WorkflowNode): WorkflowFlowNode {
  return {
    id: node.id.toString(),
    type: "workflow",
    position: {
      x: node.pos[0],
      y: node.pos[1],
    },
    data: {
      label: node.title || node.type,
      type: node.type,
      inputs: node.inputs.map((input) => ({
        name: input.name,
        type: input.type,
        widget: input.widget, // Pass through widget info
        link: input.link, // Pass through link info
      })),
      outputs: node.outputs.map((output) => ({
        name: output.name,
        type: output.type,
      })),
      widgetValues: node.widgets_values,
      properties: node.properties,
    },
    width: node.size[0],
    height: node.size[1],
  }
}

/**
 * Converts ComfyUI workflow links to React Flow edges
 *
 * ComfyUI stores links in a redundant way:
 * 1. Top-level links array: [[link_id, from_node_id, from_output_index, to_node_id, to_input_index, type]]
 * 2. Target node's input.link: link_id
 * 3. Source node's output.links: [link_id]
 *
 * We use the top-level links array as the source of truth since it's the most complete.
 */
function convertLinksToEdges(
  nodes: WorkflowNode[],
  definition: WorkflowDefinition,
): Edge[] {
  const edges: Edge[] = []

  // Create a map of node IDs for quick lookup
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))

  // Process the top-level links array
  // Format: [link_id, from_node_id, from_output_index, to_node_id, to_input_index, type]
  for (const link of definition.links) {
    const [linkId, fromNodeId, fromSlotIndex, toNodeId, toSlotIndex, linkType] =
      link

    const sourceNode = nodeMap.get(fromNodeId)
    const targetNode = nodeMap.get(toNodeId)

    if (!sourceNode || !targetNode) {
      console.warn(
        `Link ${linkId} references missing nodes: ${fromNodeId} -> ${toNodeId}`,
      )
      continue
    }

    edges.push({
      id: `e${linkId}`,
      source: fromNodeId.toString(),
      target: toNodeId.toString(),
      sourceHandle: `${fromNodeId}-output-${fromSlotIndex}`,
      targetHandle: `${toNodeId}-input-${toSlotIndex}`,
      type: "smoothstep",
      animated: false,
      label: linkType,
    })
  }

  return edges
}

/**
 * Converts a complete workflow definition to React Flow format
 *
 * @param definition - The workflow definition from the API
 * @returns Object containing nodes and edges for React Flow
 */
export function convertWorkflowToFlow(definition: WorkflowDefinition): {
  nodes: WorkflowFlowNode[]
  edges: Edge[]
} {
  const nodes = definition.nodes.map(convertNodeToFlowNode)
  const edges = convertLinksToEdges(definition.nodes, definition)

  return { nodes, edges }
}

/**
 * Gets the initial viewport settings from workflow definition
 */
export function getInitialViewport(definition: WorkflowDefinition): {
  x: number
  y: number
  zoom: number
} {
  const ds = definition.extra?.ds

  if (ds?.offset && ds?.scale) {
    return {
      x: ds.offset[0],
      y: ds.offset[1],
      zoom: ds.scale,
    }
  }

  // Default viewport
  return {
    x: 0,
    y: 0,
    zoom: 1,
  }
}
