"use client"

import {
  Background,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  ReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useCallback } from "react"
import type { WorkflowNodeData } from "@/lib/workflows/converter"
import { CustomControls } from "./custom-controls"
import { editorNodeTypes } from "./node-types"

interface FlowCanvasProps {
  nodes: Node<WorkflowNodeData>[]
  edges: Edge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
}

/**
 * FlowCanvas renders the graph using ReactFlow as a fully controlled component.
 * EditorPage maintains the single source of truth for nodes and edges.
 */
export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: FlowCanvasProps) {
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

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
