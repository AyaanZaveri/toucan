"use client"

import { createContext, useContext } from "react"
import type { WorkflowNodeData } from "@/lib/workflows/converter"

type NodeDataUpdateFn = (
  nodeId: string,
  data: Partial<WorkflowNodeData>,
) => void

const NodeDataUpdateContext = createContext<NodeDataUpdateFn | null>(null)

export const NodeDataUpdateProvider = NodeDataUpdateContext.Provider

export function useNodeDataUpdate(): NodeDataUpdateFn {
  const update = useContext(NodeDataUpdateContext)
  // If no context is provided, return a no-op function
  // This allows ComfyNode to work outside the editor context
  return update ?? (() => {})
}
