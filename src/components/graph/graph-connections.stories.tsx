import type { Meta, StoryObj } from "@storybook/react"
import {
  type Edge,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
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

  const { isConnectionValid, handleConnect } = useGraphConnections({
    nodes,
    edges,
    nodeSchemas,
    setEdges,
  })

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        isValidConnection={isConnectionValid}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      />
    </div>
  )
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
