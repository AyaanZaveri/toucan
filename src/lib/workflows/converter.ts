import type { Edge, Node } from "@xyflow/react"
import type { WorkflowDefinition, WorkflowLink, WorkflowNode } from "./types"

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
  widgetValues: unknown[] | Record<string, unknown>
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
  // Convert widgetValues array to a Record keyed by input name
  const widgetValuesRecord: Record<string, unknown> = {}
  let widgetIndex = 0
  for (const input of node.inputs) {
    if (input.widget && widgetIndex < node.widgets_values.length) {
      widgetValuesRecord[input.name] = node.widgets_values[widgetIndex]
      widgetIndex++
    }
  }

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
      widgetValues: widgetValuesRecord,
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

/**
 * Converts ReactFlow graph state back to ComfyUI WorkflowDefinition
 * This is the inverse of convertWorkflowToFlow
 *
 * @param baseWorkflow - The original loaded workflow (used as template)
 * @param flowNodes - Current ReactFlow nodes
 * @param flowEdges - Current ReactFlow edges
 * @returns Updated WorkflowDefinition with current graph state
 */
export function buildWorkflowFromFlow(
  baseWorkflow: WorkflowDefinition,
  flowNodes: Node<WorkflowNodeData>[],
  flowEdges: Edge[],
): WorkflowDefinition {
  // Clone the base workflow to avoid mutations
  const workflow = structuredClone(baseWorkflow)

  // Create a map of flow nodes by ID for quick lookup
  const flowNodeMap = new Map(flowNodes.map((node) => [node.id, node]))

  // Remove nodes that no longer exist in the flow (deleted in the UI)
  // Preserve order according to the current flow nodes.
  const workflowNodeMap = new Map(
    workflow.nodes.map((node) => [node.id.toString(), node]),
  )
  const filteredNodes: WorkflowNode[] = []
  for (const flowNode of flowNodes) {
    const existingNode = workflowNodeMap.get(flowNode.id)
    if (existingNode) {
      filteredNodes.push(existingNode)
    } else {
      console.warn(
        `[buildWorkflowFromFlow] Missing base node for flow node ${flowNode.id}; skipping.`,
      )
    }
  }
  workflow.nodes = filteredNodes

  // Build a map to track new link IDs
  let nextLinkId = workflow.last_link_id + 1
  const edgeLinkMap = new Map<string, number>() // edge.id -> linkId

  // First, try to preserve existing link IDs where possible
  for (const edge of flowEdges) {
    // Check if this edge corresponds to an existing link
    const edgeIdMatch = edge.id.match(/^e(\d+)$/)
    if (edgeIdMatch) {
      const existingLinkId = Number.parseInt(edgeIdMatch[1], 10)
      edgeLinkMap.set(edge.id, existingLinkId)
      nextLinkId = Math.max(nextLinkId, existingLinkId + 1)
    }
  }

  // Assign new link IDs to edges without existing IDs
  for (const edge of flowEdges) {
    if (!edgeLinkMap.has(edge.id)) {
      edgeLinkMap.set(edge.id, nextLinkId++)
    }
  }

  // Build the new links array
  const newLinks: WorkflowLink[] = []
  for (const edge of flowEdges) {
    const linkId = edgeLinkMap.get(edge.id)!
    const fromNodeId = Number.parseInt(edge.source, 10)
    const toNodeId = Number.parseInt(edge.target, 10)

    // Extract output and input indices from handles
    // Handle format: "nodeId-output-idx" or "nodeId-input-idx"
    const sourceHandleParts = (edge.sourceHandle ?? "").split("-")
    const targetHandleParts = (edge.targetHandle ?? "").split("-")
    const fromOutputIndex = Number.parseInt(sourceHandleParts.pop() ?? "-1", 10)
    const toInputIndex = Number.parseInt(targetHandleParts.pop() ?? "-1", 10)

    if (fromOutputIndex < 0 || toInputIndex < 0) {
      console.warn(`Invalid edge handle indices for edge ${edge.id}`)
      continue
    }

    // Get the type from the source node's output
    const sourceFlowNode = flowNodeMap.get(edge.source)
    const linkType =
      sourceFlowNode?.data.outputs?.[fromOutputIndex]?.type ?? "*"

    newLinks.push([
      linkId,
      fromNodeId,
      fromOutputIndex,
      toNodeId,
      toInputIndex,
      linkType,
    ])
  }

  // Update the workflow's links array
  workflow.links = newLinks
  workflow.last_link_id = nextLinkId - 1

  // Update each node
  for (const workflowNode of workflow.nodes) {
    const flowNode = flowNodeMap.get(workflowNode.id.toString())
    if (!flowNode) continue

    // Update position
    workflowNode.pos = [flowNode.position.x, flowNode.position.y]

    // Update widget values
    // flowNode.data.widgetValues is a Record<string, unknown>
    // workflowNode.widgets_values is an array
    // We need to rebuild the array in the correct order based on inputs with widgets
    const widgetValues = flowNode.data.widgetValues ?? {}
    const orderedValues: unknown[] = []

    for (const input of workflowNode.inputs) {
      if (input.widget) {
        // If widgetValues is a Record, get value by input name
        if (!Array.isArray(widgetValues)) {
          const value = widgetValues[input.name]
          orderedValues.push(value !== undefined ? value : null)
        } else {
          // Fallback: if somehow still an array, use index
          orderedValues.push(widgetValues[orderedValues.length] ?? null)
        }
      }
    }
    workflowNode.widgets_values = orderedValues

    // Clear existing input links
    for (const input of workflowNode.inputs) {
      input.link = null
    }

    // Clear existing output links
    for (const output of workflowNode.outputs) {
      output.links = []
    }
  }

  // Update input and output links based on the new links array
  for (const link of newLinks) {
    const [linkId, fromNodeId, fromOutputIndex, toNodeId, toInputIndex] = link

    const targetNode = workflow.nodes.find((n) => n.id === toNodeId)
    const sourceNode = workflow.nodes.find((n) => n.id === fromNodeId)

    if (targetNode?.inputs[toInputIndex]) {
      targetNode.inputs[toInputIndex].link = linkId
    }

    if (sourceNode?.outputs[fromOutputIndex]) {
      if (!sourceNode.outputs[fromOutputIndex].links) {
        sourceNode.outputs[fromOutputIndex].links = []
      }
      sourceNode.outputs[fromOutputIndex].links!.push(linkId)
    }
  }

  return workflow
}
