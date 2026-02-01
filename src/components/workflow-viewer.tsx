"use client"

import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type OnConnect,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import { useCallback, useMemo } from "react"
import "@xyflow/react/dist/style.css"
import {
  convertWorkflowToFlow,
  getInitialViewport,
} from "@/lib/workflows/converter"
import type { WorkflowDefinition } from "@/lib/workflows/types"
import { WorkflowNode } from "./workflow-node"

interface WorkflowViewerProps {
  workflow: WorkflowDefinition
  onNodeClick?: (nodeId: string) => void
}

const nodeTypes = {
  workflow: WorkflowNode,
}

/**
 * WorkflowViewer component renders a ComfyUI workflow using React Flow
 */
export function WorkflowViewer({ workflow, onNodeClick }: WorkflowViewerProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => convertWorkflowToFlow(workflow),
    [workflow],
  )

  const initialViewport = useMemo(
    () => getInitialViewport(workflow),
    [workflow],
  )

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  )

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      onNodeClick?.(node.id)
    },
    [onNodeClick],
  )

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        defaultViewport={initialViewport}
        fitView
        minZoom={0.1}
        maxZoom={4}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-background !border-border"
        />
        <Panel
          position="top-left"
          className="bg-background/95 backdrop-blur rounded-lg border border-border p-3 shadow-lg"
        >
          <div className="space-y-1">
            <div className="font-semibold text-sm">Workflow: {workflow.id}</div>
            <div className="text-muted-foreground text-xs">
              {nodes.length} nodes, {edges.length} connections
            </div>
            <div className="text-muted-foreground text-xs">
              Version: {workflow.version}
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
