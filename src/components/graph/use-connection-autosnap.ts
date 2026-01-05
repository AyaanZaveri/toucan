import {
  type Connection,
  type ConnectionState,
  type Edge,
  type Handle,
  type InternalNode,
  Position,
  useConnection,
  useStoreApi,
} from "@xyflow/react"
import * as React from "react"
import type { CanvasNode } from "@/components/graph/comfy-node"
import type { NodeSchemaMap, OutputSlot } from "@/lib/comfy/objectInfo"

type UseConnectionAutosnapArgs = {
  isConnectionValid: (connection: Connection | Edge) => boolean
  nodeSchemas: NodeSchemaMap
}

type SnapCandidate = {
  connection: Connection
  handle: Handle
}

type FlowInternalNode = InternalNode<CanvasNode>
type FlowConnectionState = ConnectionState<FlowInternalNode>

export type ConnectionAutosnapPreview = {
  connection: Connection
  handle: Handle
  node: FlowInternalNode
  to: { x: number; y: number }
  toPosition: Position
}

const toContainerPosition = (
  position: { x: number; y: number },
  transform: [number, number, number],
) => ({
  x: position.x * transform[2] + transform[0],
  y: position.y * transform[2] + transform[1],
})

const fromContainerPosition = (
  position: { x: number; y: number },
  transform: [number, number, number],
) => ({
  x: (position.x - transform[0]) / transform[2],
  y: (position.y - transform[1]) / transform[2],
})

const getHandleCenterPosition = (node: FlowInternalNode, handle: Handle) => {
  const x = (handle.x ?? 0) + node.internals.positionAbsolute.x
  const y = (handle.y ?? 0) + node.internals.positionAbsolute.y
  const width = handle.width ?? 0
  const height = handle.height ?? 0
  return {
    x: x + width / 2,
    y: y + height / 2,
  }
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

const findHoveredNode = (
  connection: FlowConnectionState,
  transform: [number, number, number],
  nodes: Map<string, FlowInternalNode>,
  domNode: HTMLElement | null,
): FlowInternalNode | null => {
  const pointer = connection.pointer ?? connection.to
  if (!pointer) {
    return null
  }

  if (domNode) {
    const bounds = domNode.getBoundingClientRect()
    const doc = domNode.ownerDocument ?? document
    const dpr = doc.defaultView?.devicePixelRatio ?? 1
    const containerPoint = {
      x: pointer.x + bounds.left,
      y: pointer.y + bounds.top,
    }
    const graphAsContainer = toContainerPosition(pointer, transform)
    const candidatePoints = [
      { x: pointer.x, y: pointer.y },
      containerPoint,
      { x: graphAsContainer.x, y: graphAsContainer.y },
      {
        x: graphAsContainer.x + bounds.left,
        y: graphAsContainer.y + bounds.top,
      },
    ]
    if (dpr !== 1) {
      const scaledPoints = candidatePoints.map((point) => ({
        x: point.x / dpr,
        y: point.y / dpr,
      }))
      candidatePoints.push(...scaledPoints)
    }

    for (const point of candidatePoints) {
      const element = doc.elementFromPoint(point.x, point.y)
      const nodeElement = element?.closest(".react-flow__node")
      const nodeId = nodeElement?.getAttribute("data-id")
      if (nodeId && nodeId !== connection.fromNode?.id) {
        const hovered = nodes.get(nodeId) ?? null
        if (hovered) {
          return hovered
        }
      }
    }

    const nodeElements = Array.from(
      domNode.querySelectorAll<HTMLElement>(".react-flow__node[data-id]"),
    )
    for (const point of candidatePoints) {
      for (const nodeElement of nodeElements) {
        const nodeId = nodeElement.getAttribute("data-id")
        if (!nodeId || nodeId === connection.fromNode?.id) {
          continue
        }
        const rect = nodeElement.getBoundingClientRect()
        const inside =
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom
        if (inside) {
          const hovered = nodes.get(nodeId) ?? null
          if (hovered) {
            return hovered
          }
        }
      }
    }
  }

  const findHoveredByRect = (
    pointer: { x: number; y: number },
    rectTransform: [number, number, number],
  ) => {
    const [tx, ty, zoom] = rectTransform
    let hovered: FlowInternalNode | null = null
    for (const node of nodes.values()) {
      if (node.id === connection.fromNode?.id) {
        continue
      }
      const width = node.measured?.width ?? node.width ?? 0
      const height = node.measured?.height ?? node.height ?? 0
      if (!width || !height) {
        continue
      }
      const { x, y } = node.internals.positionAbsolute
      const rectX = x * zoom + tx
      const rectY = y * zoom + ty
      const rectWidth = width * zoom
      const rectHeight = height * zoom
      const inside =
        pointer.x >= rectX &&
        pointer.x <= rectX + rectWidth &&
        pointer.y >= rectY &&
        pointer.y <= rectY + rectHeight
      if (!inside) {
        continue
      }
      if (!hovered || node.internals.z > hovered.internals.z) {
        hovered = node
      }
    }
    return hovered
  }

  const hoveredScreen = findHoveredByRect(pointer, transform)
  if (hoveredScreen) {
    return hoveredScreen
  }

  return findHoveredByRect(pointer, [0, 0, 1])
}

const findFirstCompatibleInput = (
  inputSchema: NodeSchemaMap[string],
  outputType: OutputSlot["type"],
) =>
  inputSchema.inputs.find(
    (slot) => slot.group !== "hidden" && slot.valueType === outputType,
  )

const findFirstCompatibleOutput = (
  outputSchema: NodeSchemaMap[string],
  inputType: string,
) => outputSchema.outputs.find((slot) => slot.type === inputType)

const buildSnapCandidate = (
  connection: FlowConnectionState,
  hoveredNode: FlowInternalNode,
  nodeSchemas: NodeSchemaMap,
): SnapCandidate | null => {
  const fromNodeType = connection.fromNode?.data?.nodeType
  if (!fromNodeType) {
    return null
  }
  const fromSchema = nodeSchemas[fromNodeType]
  if (!fromSchema) {
    return null
  }
  const hoveredNodeType = hoveredNode.data?.nodeType
  if (!hoveredNodeType) {
    return null
  }
  const hoveredSchema = nodeSchemas[hoveredNodeType]
  if (!hoveredSchema) {
    return null
  }
  const fromHandleId = connection.fromHandle?.id
  if (!fromHandleId || !connection.fromHandle?.type) {
    return null
  }

  if (connection.fromHandle.type === "source") {
    const slotName = parseHandleSlotName(fromHandleId, "out-")
    if (!slotName) {
      return null
    }
    const outputSlot = fromSchema.outputs.find((slot) => slot.name === slotName)
    if (!outputSlot) {
      return null
    }
    const compatibleInput = findFirstCompatibleInput(
      hoveredSchema,
      outputSlot.type,
    )
    if (!compatibleInput) {
      return null
    }
    const targetHandleId = `in-${compatibleInput.name}`
    return {
      connection: {
        source: connection.fromNode?.id ?? "",
        sourceHandle: fromHandleId,
        target: hoveredNode.id,
        targetHandle: targetHandleId,
      },
      handle: {
        id: targetHandleId,
        nodeId: hoveredNode.id,
        type: "target",
        position: Position.Left,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      },
    }
  }

  const slotName = parseHandleSlotName(fromHandleId, "in-")
  if (!slotName) {
    return null
  }
  const inputSlot = fromSchema.inputs.find((slot) => slot.name === slotName)
  const inputType = inputSlot?.valueType
  if (!inputType) {
    return null
  }
  const compatibleOutput = findFirstCompatibleOutput(hoveredSchema, inputType)
  if (!compatibleOutput) {
    return null
  }
  const sourceHandleId = `out-${compatibleOutput.name}`
  return {
    connection: {
      source: hoveredNode.id,
      sourceHandle: sourceHandleId,
      target: connection.fromNode?.id ?? "",
      targetHandle: fromHandleId,
    },
    handle: {
      id: sourceHandleId,
      nodeId: hoveredNode.id,
      type: "source",
      position: Position.Right,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
  }
}

const resolveConnectionSpace = (
  connection: FlowConnectionState,
  transform: [number, number, number],
) => {
  const fromNode = connection.fromNode
  const fromHandle = connection.fromHandle
  if (!fromNode || !fromHandle) {
    return "graph"
  }
  const fromCenter = getHandleCenterPosition(fromNode, fromHandle)
  const fromScreen = toContainerPosition(fromCenter, transform)
  const distanceToGraph = Math.hypot(
    connection.from.x - fromCenter.x,
    connection.from.y - fromCenter.y,
  )
  const distanceToScreen = Math.hypot(
    connection.from.x - fromScreen.x,
    connection.from.y - fromScreen.y,
  )
  return distanceToGraph <= distanceToScreen ? "graph" : "screen"
}

const resolveHandleFromDom = (
  domNode: HTMLElement | null,
  candidate: SnapCandidate,
  transform: [number, number, number],
): Handle | null => {
  if (!domNode) {
    return null
  }
  const doc = domNode.ownerDocument ?? document
  const handleElement = doc.querySelector(
    `.react-flow__handle[data-nodeid="${candidate.handle.nodeId}"][data-handleid="${candidate.handle.id}"]`,
  ) as HTMLElement | null
  if (!handleElement) {
    return null
  }
  const handleRect = handleElement.getBoundingClientRect()
  const containerRect = domNode.getBoundingClientRect()
  const centerScreen = {
    x: handleRect.left + handleRect.width / 2 - containerRect.left,
    y: handleRect.top + handleRect.height / 2 - containerRect.top,
  }
  const centerGraph = fromContainerPosition(centerScreen, transform)
  return {
    id: candidate.handle.id,
    nodeId: candidate.handle.nodeId,
    type: candidate.handle.type,
    position: candidate.handle.position,
    x: centerGraph.x,
    y: centerGraph.y,
    width: handleRect.width / transform[2],
    height: handleRect.height / transform[2],
  }
}

const resolveSnapHandle = (
  hoveredNode: FlowInternalNode,
  candidate: SnapCandidate,
  domNode: HTMLElement | null,
  transform: [number, number, number],
): Handle | null => {
  const bounds = hoveredNode.internals.handleBounds?.[candidate.handle.type]
  if (!bounds) {
    return resolveHandleFromDom(domNode, candidate, transform)
  }
  const handle = bounds.find((item) => item.id === candidate.handle.id)
  if (!handle) {
    return resolveHandleFromDom(domNode, candidate, transform)
  }
  const center = getHandleCenterPosition(hoveredNode, handle)
  return {
    ...handle,
    ...center,
  }
}

export const useConnectionAutosnapCandidate = ({
  isConnectionValid,
  nodeSchemas,
}: UseConnectionAutosnapArgs) => {
  const connection = useConnection<CanvasNode>()
  const store = useStoreApi<CanvasNode, Edge>()
  return React.useMemo<ConnectionAutosnapPreview | null>(() => {
    if (!connection.inProgress) {
      return null
    }
    if (!connection.fromHandle || !connection.fromNode) {
      return null
    }
    if (connection.toHandle && connection.isValid) {
      return null
    }

    const { transform, nodeLookup, domNode } = store.getState()
    const hoveredNode = findHoveredNode(
      connection,
      transform,
      nodeLookup,
      domNode,
    )
    if (!hoveredNode) {
      return null
    }

    const candidate = buildSnapCandidate(connection, hoveredNode, nodeSchemas)
    if (!candidate) {
      return null
    }
    if (!isConnectionValid(candidate.connection)) {
      return null
    }
    const snappedHandle = resolveSnapHandle(
      hoveredNode,
      candidate,
      domNode,
      transform,
    )
    if (!snappedHandle) {
      return null
    }

    const isAlreadySnapped =
      connection.toHandle?.id === snappedHandle.id &&
      connection.toHandle?.nodeId === snappedHandle.nodeId &&
      connection.toHandle?.type === snappedHandle.type
    if (isAlreadySnapped) {
      return null
    }

    const connectionSpace = resolveConnectionSpace(connection, transform)
    const targetPoint =
      connectionSpace === "graph"
        ? { x: snappedHandle.x ?? 0, y: snappedHandle.y ?? 0 }
        : toContainerPosition(snappedHandle, transform)

    return {
      connection: candidate.connection,
      handle: snappedHandle,
      node: hoveredNode,
      to: targetPoint,
      toPosition: snappedHandle.position ?? Position.Left,
    }
  }, [connection, isConnectionValid, nodeSchemas, store])
}
