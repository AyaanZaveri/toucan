"use client"

import {
  addEdge,
  Background,
  type Connection,
  type Edge,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useCallback, useEffect } from "react"
import type { WorkflowNodeData } from "@/lib/workflows/converter"
import { CustomControls } from "./custom-controls"
import { editorNodeTypes } from "./node-types"

interface FlowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onGraphChange?: () => void
}

/**
 * FlowCanvas renders the graph using ReactFlow
 * Handles pan, zoom, draggable nodes, and fitView on load
 */
export function FlowCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  onGraphChange,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes and edges when props change
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  // Validate connections based on port type matching
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      // Prevent input→input or output→output connections
      // ReactFlow already prevents this, but we check explicitly
      const source = connection.source
      const target = connection.target
      const sourceHandle = connection.sourceHandle ?? null
      const targetHandle = connection.targetHandle ?? null

      if (!source || !target) return false

      const sourceNode = nodes.find((n) => n.id === source)
      const targetNode = nodes.find((n) => n.id === target)

      if (!sourceNode || !targetNode) return false

      // Extract handle indices from handle IDs (format: "nodeId-output-idx" or "nodeId-input-idx")
      const sourceHandleId = sourceHandle || ""
      const targetHandleId = targetHandle || ""

      const sourceIdx = Number.parseInt(
        sourceHandleId.split("-").pop() || "-1",
        10,
      )
      const targetIdx = Number.parseInt(
        targetHandleId.split("-").pop() || "-1",
        10,
      )

      if (sourceIdx < 0 || targetIdx < 0) return false

      const sourceData = sourceNode.data as WorkflowNodeData
      const targetData = targetNode.data as WorkflowNodeData

      const sourceOutput = sourceData.outputs?.[sourceIdx]
      const targetInput = targetData.inputs?.[targetIdx]

      if (!sourceOutput || !targetInput) return false

      // Normalize types for comparison (case-insensitive)
      const sourceType = sourceOutput.type.toLowerCase()
      const targetType = targetInput.type.toLowerCase()

      // Types must match exactly
      return sourceType === targetType
    },
    [nodes],
  )

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds))
      if (onGraphChange) {
        onGraphChange()
      }
    },
    [setEdges, onGraphChange],
  )

  // Notify parent of any changes
  const handleNodesChange = (changes: any) => {
    onNodesChange(changes)
    if (onGraphChange) {
      onGraphChange()
    }
  }

  const handleEdgesChange = (changes: any) => {
    onEdgesChange(changes)
    if (onGraphChange) {
      onGraphChange()
    }
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={editorNodeTypes}
        isValidConnection={isValidConnection}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
        }}
      >
        <Background />
        <CustomControls />
      </ReactFlow>
    </div>
  )
}
