import type { Meta, StoryObj } from "@storybook/react"
import {
  type Connection,
  type ConnectionLineComponentProps,
  ConnectionLineType,
  type Edge,
  type FinalConnectionState,
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import * as React from "react"
import "@xyflow/react/dist/style.css"

import "../../app/globals.css"

import {
  type CanvasNode,
  NodeSchemaContext,
  nodeTypes,
} from "@/components/graph/comfy-node"
import {
  type ExecutionState,
  ExecutionStateContext,
} from "@/components/graph/execution-context"
import { useConnectionAutosnapCandidate } from "@/components/graph/use-connection-autosnap"
import { useGraphConnections } from "@/components/graph/use-graph-connections"
import type { NodeSchemaMap } from "@/lib/comfy/objectInfo"

const sourceNodeType = "ImageSource"
const targetNodeType = "ImageTarget"

const nodeSchemas: NodeSchemaMap = {
  [sourceNodeType]: {
    name: sourceNodeType,
    displayName: "Image Source",
    description: "Provides an image output.",
    category: "Input",
    inputs: [],
    outputs: [
      {
        name: "image",
        type: "IMAGE",
        isList: false,
      },
    ],
    isOutputNode: false,
    searchValue: "Image Source",
  },
  [targetNodeType]: {
    name: targetNodeType,
    displayName: "Image Target",
    description: "Accepts an image input.",
    category: "Process",
    inputs: [
      {
        name: "image",
        group: "required",
        rawType: "IMAGE",
        valueType: "IMAGE",
        options: [],
        config: null,
        tooltip: "Image input",
        supportsWidget: false,
        forceInput: true,
      },
    ],
    outputs: [],
    isOutputNode: false,
    searchValue: "Image Target",
  },
}

const executionState: ExecutionState = {
  phase: "idle",
  promptId: null,
  currentNodeId: null,
  queueRemaining: null,
  startedAt: null,
  nodeStatuses: {},
  nodeProgress: {},
  nodeErrors: {},
  nodeOutputs: {},
}

const initialNodes: CanvasNode[] = [
  {
    id: "source-node-1",
    type: "comfy",
    position: { x: 0, y: 0 },
    data: {
      label: "Image Source",
      nodeType: sourceNodeType,
      widgetValues: {},
      widgetControlValues: {},
    },
  },
  {
    id: "target-node-1",
    type: "comfy",
    position: { x: 320, y: 0 },
    data: {
      label: "Image Target",
      nodeType: targetNodeType,
      widgetValues: {},
      widgetControlValues: {},
    },
  },
]

function ConnectionFlow() {
  const [nodes, , onNodesChange] = useNodesState<CanvasNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const autosnapCandidateRef = React.useRef<Connection | null>(null)

  const { isConnectionValid, handleConnect } = useGraphConnections({
    nodes,
    edges,
    nodeSchemas,
    setEdges,
  })

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
  }, [isConnectionValid])

  return (
    <div className="h-full w-full">
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
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <ConnectionAutosnapController
          isConnectionValid={isConnectionValid}
          nodeSchemas={nodeSchemas}
          onCandidateChange={handleAutosnapCandidate}
        />
      </ReactFlow>
    </div>
  )
}

const ConnectionAutosnapController = ({
  isConnectionValid,
  nodeSchemas,
  onCandidateChange,
}: {
  isConnectionValid: (connection: Connection | Edge) => boolean
  nodeSchemas: NodeSchemaMap
  onCandidateChange: (candidate: Connection | null) => void
}) => {
  const preview = useConnectionAutosnapCandidate({
    isConnectionValid,
    nodeSchemas,
  })

  React.useEffect(() => {
    onCandidateChange(preview?.connection ?? null)
  }, [onCandidateChange, preview])
  return null
}

const meta = {
  title: "Graph/Connections",
  component: ConnectionFlow,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <NodeSchemaContext.Provider value={nodeSchemas}>
          <ExecutionStateContext.Provider value={executionState}>
            <div className="bg-slate-100 p-6">
              <div className="h-[320px] w-[720px]">
                <Story />
              </div>
            </div>
          </ExecutionStateContext.Provider>
        </NodeSchemaContext.Provider>
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof ConnectionFlow>

export default meta

type Story = StoryObj<typeof ConnectionFlow>

export const ConnectionHandles: Story = {}
