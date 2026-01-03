"use client"

import {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import * as React from "react"
import {
  type CanvasNode,
  NodeSchemaContext,
  nodeTypes,
} from "@/components/graph/comfy-node"
import { CommandPalette } from "@/components/graph/command-palette"
import { useCommandPaletteOpen } from "@/components/graph/use-command-palette-open"
import { useNodeCatalog } from "@/components/graph/use-node-catalog"
import type {
  InputSlot,
  NodeCatalogEntry,
  NodeSchema,
  NodeSchemaMap,
  OutputSlot,
} from "@/lib/comfy/objectInfo"
import { buildWidgetDefaults } from "@/lib/comfy/widget-defaults"

type ResolvedConnectionSlots = {
  sourceNode: CanvasNode
  targetNode: CanvasNode
  sourceSchema: NodeSchema
  targetSchema: NodeSchema
  sourceSlot: OutputSlot
  targetSlot: InputSlot
}

const isTypeCompatible = (resolved: ResolvedConnectionSlots) => {
  const targetType = resolved.targetSlot.valueType
  if (!targetType) {
    return false
  }

  return resolved.sourceSlot.type === targetType
}

const createsCycle = (connection: Connection | Edge, edges: Edge[]) => {
  if (!connection.source || !connection.target) {
    return true
  }

  if (connection.source === connection.target) {
    return true
  }

  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    const { source, target } = edge
    if (!source || !target) {
      continue
    }
    const neighbors = adjacency.get(source)
    if (neighbors) {
      neighbors.push(target)
    } else {
      adjacency.set(source, [target])
    }
  }

  const stack = [connection.target]
  const visited = new Set<string>()
  while (stack.length > 0) {
    const nodeId = stack.pop()
    if (!nodeId) {
      continue
    }
    if (nodeId === connection.source) {
      return true
    }
    if (visited.has(nodeId)) {
      continue
    }
    visited.add(nodeId)
    const neighbors = adjacency.get(nodeId)
    if (!neighbors) {
      continue
    }
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor)
      }
    }
  }

  return false
}

const parseHandleSlotName = (
  handleId: string | null | undefined,
  prefix: "in-" | "out-",
) => {
  if (!handleId?.startsWith(prefix)) {
    return null
  }
  const slotName = handleId.slice(prefix.length)
  return slotName.length > 0 ? slotName : null
}

const resolveConnectionSlots = (
  connection: Connection | Edge,
  nodes: CanvasNode[],
  nodeSchemas: NodeSchemaMap,
): ResolvedConnectionSlots | null => {
  if (!connection.source || !connection.target) {
    return null
  }

  const sourceSlotName = parseHandleSlotName(connection.sourceHandle, "out-")
  const targetSlotName = parseHandleSlotName(connection.targetHandle, "in-")
  if (!sourceSlotName || !targetSlotName) {
    return null
  }

  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)
  if (!sourceNode || !targetNode) {
    return null
  }

  const sourceSchema = nodeSchemas[sourceNode.data.nodeType]
  const targetSchema = nodeSchemas[targetNode.data.nodeType]
  if (!sourceSchema || !targetSchema) {
    return null
  }

  const sourceSlot = sourceSchema.outputs.find(
    (slot) => slot.name === sourceSlotName,
  )
  const targetSlot = targetSchema.inputs.find(
    (slot) => slot.name === targetSlotName,
  )
  if (!sourceSlot || !targetSlot) {
    return null
  }

  return {
    sourceNode,
    targetNode,
    sourceSchema,
    targetSchema,
    sourceSlot,
    targetSlot,
  }
}

export function ComfyFlowCanvas() {
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPaletteOpen()
  const {
    nodeDefs,
    nodeSchemas,
    loading: nodesLoading,
    error: nodesError,
  } = useNodeCatalog()
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const reactFlowInstanceRef =
    React.useRef<ReactFlowInstance<CanvasNode> | null>(null)

  const handleAddNode = React.useCallback(
    (nodeDef: NodeCatalogEntry) => {
      setNodes((current) => {
        const index = current.length
        const instance = reactFlowInstanceRef.current
        const center = instance
          ? instance.screenToFlowPosition({
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            })
          : { x: 0, y: 0 }
        const offset = 24 * index
        const position = {
          x: center.x + offset,
          y: center.y + offset,
        }
        const widgetValues = buildWidgetDefaults(nodeSchemas[nodeDef.name])

        return [
          ...current,
          {
            id: `node-${index + 1}`,
            type: "comfy",
            position,
            data: {
              label: nodeDef.displayName,
              nodeType: nodeDef.name,
              widgetValues,
            },
          },
        ]
      })
      setCommandOpen(false)
    },
    [nodeSchemas, setCommandOpen, setNodes],
  )

  const isConnectionValid = React.useCallback(
    (connection: Connection | Edge) => {
      const resolved = resolveConnectionSlots(connection, nodes, nodeSchemas)
      if (!resolved) {
        return false
      }

      if (!isTypeCompatible(resolved)) {
        return false
      }

      if (createsCycle(connection, edges)) {
        return false
      }

      return true
    },
    [edges, nodeSchemas, nodes],
  )

  const handleConnect = React.useCallback(
    (connection: Connection) => {
      if (!isConnectionValid(connection)) {
        return
      }
      setEdges((current) => addEdge(connection, current))
    },
    [isConnectionValid, setEdges],
  )

  const emptyStateText = nodesLoading
    ? "Loading nodes..."
    : (nodesError ?? "No nodes found.")

  return (
    <NodeSchemaContext.Provider value={nodeSchemas}>
      <div style={{ height: "100vh", width: "100vw" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          isValidConnection={isConnectionValid}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          nodeDefs={nodeDefs}
          emptyStateText={emptyStateText}
          onSelectNode={handleAddNode}
        />
      </div>
    </NodeSchemaContext.Provider>
  )
}
