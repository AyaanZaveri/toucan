"use client"

import {
  Background,
  type Connection,
  type ConnectionLineComponentProps,
  ConnectionLineType,
  Controls,
  type Edge,
  type FinalConnectionState,
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
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
import { API_BASE } from "@/components/graph/constants"
import { ExecutionStateContext } from "@/components/graph/execution-context"
import { ExecutionHud } from "@/components/graph/execution-hud"
import { useAddNode } from "@/components/graph/use-add-node"
import { useCommandPaletteOpen } from "@/components/graph/use-command-palette-open"
import { useConnectionAutosnapCandidate } from "@/components/graph/use-connection-autosnap"
import { useExecutionMonitor } from "@/components/graph/use-execution-monitor"
import { useGraphConnections } from "@/components/graph/use-graph-connections"
import { useGraphShortcuts } from "@/components/graph/use-graph-shortcuts"
import { useNodeCatalog } from "@/components/graph/use-node-catalog"
import { useQueuePrompt } from "@/components/graph/use-queue-prompt"
import { useWorkflowPersistence } from "@/components/graph/use-workflow-persistence"
import type { NodeSchemaMap } from "@/lib/comfy/objectInfo"

type ConnectionAutosnapControllerProps = {
  isConnectionValid: (connection: Connection | Edge) => boolean
  nodeSchemas: NodeSchemaMap
  onCandidateChange: (candidate: Connection | null) => void
}

const ConnectionAutosnapController = ({
  isConnectionValid,
  nodeSchemas,
  onCandidateChange,
}: ConnectionAutosnapControllerProps) => {
  const preview = useConnectionAutosnapCandidate({
    isConnectionValid,
    nodeSchemas,
  })

  React.useEffect(() => {
    onCandidateChange(preview?.connection ?? null)
  }, [onCandidateChange, preview])
  return null
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
  const schemasReady = Object.keys(nodeSchemas).length > 0
  const [isFlowReady, setIsFlowReady] = React.useState(false)

  const reactFlowInstanceRef =
    React.useRef<ReactFlowInstance<CanvasNode> | null>(null)

  const { saveWorkflow, restoreWorkflow, createSnapshot } =
    useWorkflowPersistence({
      instanceRef: reactFlowInstanceRef,
      setNodes,
      setEdges,
    })

  const {
    state: executionState,
    markPromptQueued,
    interrupt,
  } = useExecutionMonitor({
    apiBase: API_BASE,
  })

  const { queuePrompt } = useQueuePrompt({
    nodes,
    edges,
    nodeSchemas,
    setNodes,
    apiBase: API_BASE,
    getSnapshot: createSnapshot,
    onQueued: markPromptQueued,
  })

  const { isConnectionValid, handleConnect } = useGraphConnections({
    nodes,
    edges,
    nodeSchemas,
    setEdges,
  })

  const autosnapCandidateRef = React.useRef<Connection | null>(null)

  const handleAutosnapCandidate = React.useCallback(
    (candidate: Connection | null) => {
      autosnapCandidateRef.current = candidate
    },
    [],
  )

  const handleConnectEnd = React.useCallback(
    (
      _event: MouseEvent | TouchEvent,
      connectionState: FinalConnectionState,
    ) => {
      if (connectionState?.toHandle && connectionState?.isValid) {
        return
      }
      const candidate = autosnapCandidateRef.current
      if (candidate) {
        handleConnect(candidate)
      }
    },
    [handleConnect],
  )

  const AutosnapConnectionLine = React.useMemo(() => {
    const ConnectionLine = ({
      connectionLineStyle,
      connectionLineType,
      fromX,
      fromY,
      toX,
      toY,
      fromPosition,
      toPosition,
    }: ConnectionLineComponentProps<CanvasNode>) => {
      const preview = useConnectionAutosnapCandidate({
        isConnectionValid,
        nodeSchemas,
      })
      const targetX = preview?.to.x ?? toX
      const targetY = preview?.to.y ?? toY
      const targetPosition = preview?.toPosition ?? toPosition
      const adjustedTargetY =
        Math.abs(targetY - fromY) < 0.5 ? targetY + 0.5 : targetY
      const pathParams = {
        sourceX: fromX,
        sourceY: fromY,
        sourcePosition: fromPosition,
        targetX,
        targetY: adjustedTargetY,
        targetPosition,
      }
      let path = ""
      switch (connectionLineType) {
        case ConnectionLineType.Bezier:
          ;[path] = getBezierPath(pathParams)
          break
        case ConnectionLineType.SimpleBezier:
          ;[path] = getSimpleBezierPath(pathParams)
          break
        case ConnectionLineType.Step:
          ;[path] = getSmoothStepPath({ ...pathParams, borderRadius: 0 })
          break
        case ConnectionLineType.SmoothStep:
          ;[path] = getSmoothStepPath(pathParams)
          break
        default:
          ;[path] = getStraightPath(pathParams)
      }
      return (
        <path
          d={path}
          fill="none"
          stroke="var(--xy-connectionline-stroke, var(--xy-connectionline-stroke-default))"
          strokeWidth={1}
          className="react-flow__connection-path"
          style={connectionLineStyle}
        />
      )
    }

    ConnectionLine.displayName = "AutosnapConnectionLine"
    return ConnectionLine
  }, [isConnectionValid, nodeSchemas])

  const { addNode } = useAddNode({
    nodeSchemas,
    setNodes,
    setCommandOpen,
    instanceRef: reactFlowInstanceRef,
  })

  useGraphShortcuts({ onSave: saveWorkflow, onQueue: queuePrompt })

  const emptyStateText = nodesLoading
    ? "Loading nodes..."
    : (nodesError ?? "No nodes found.")

  const currentNodeLabel = React.useMemo(() => {
    if (!executionState.currentNodeId) {
      return null
    }
    const node = nodes.find((item) => item.id === executionState.currentNodeId)
    if (!node) {
      return `Node ${executionState.currentNodeId}`
    }
    const schema = nodeSchemas[node.data.nodeType]
    return schema?.displayName ?? node.data.label
  }, [executionState.currentNodeId, nodeSchemas, nodes])

  React.useEffect(() => {
    const instance = reactFlowInstanceRef.current
    if (!instance || !schemasReady || !isFlowReady) {
      return
    }
    // Ensure handle metadata is available before rehydrating edges.
    restoreWorkflow(instance)
  }, [isFlowReady, restoreWorkflow, schemasReady])

  return (
    <NodeSchemaContext.Provider value={nodeSchemas}>
      <ExecutionStateContext.Provider value={executionState}>
        <div className="relative" style={{ height: "100vh", width: "100vw" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onConnectEnd={handleConnectEnd}
            isValidConnection={isConnectionValid}
            nodeTypes={nodeTypes}
            connectionLineComponent={AutosnapConnectionLine}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance
              setIsFlowReady(true)
            }}
            proOptions={{ hideAttribution: true }}
          >
            <ConnectionAutosnapController
              isConnectionValid={isConnectionValid}
              nodeSchemas={nodeSchemas}
              onCandidateChange={handleAutosnapCandidate}
            />
            <Background />
            <Controls />
          </ReactFlow>
          <ExecutionHud
            phase={executionState.phase}
            currentNodeLabel={currentNodeLabel}
            queueRemaining={executionState.queueRemaining}
            startedAt={executionState.startedAt}
            onCancel={interrupt}
          />
          <CommandPalette
            open={commandOpen}
            onOpenChange={setCommandOpen}
            nodeDefs={nodeDefs}
            emptyStateText={emptyStateText}
            onSelectNode={addNode}
          />
        </div>
      </ExecutionStateContext.Provider>
    </NodeSchemaContext.Provider>
  )
}
