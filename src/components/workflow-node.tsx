"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"
import { memo } from "react"
import type { WorkflowFlowNode } from "@/lib/workflows/converter"

/**
 * Custom node component for rendering workflow nodes
 */
function WorkflowNodeComponent({
  data,
  selected,
}: NodeProps<WorkflowFlowNode>) {
  return (
    <div
      className={`rounded-lg border-2 bg-background shadow-lg transition-all ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
      style={{ minWidth: 200 }}
    >
      {/* Node Header */}
      <div className="border-b border-border bg-muted px-3 py-2">
        <div className="font-semibold text-sm">{data.label}</div>
        <div className="text-muted-foreground text-xs">{data.type}</div>
      </div>

      {/* Node Content */}
      <div className="p-3">
        {/* Inputs */}
        {data.inputs.length > 0 && (
          <div className="mb-2 space-y-1">
            {data.inputs.map((input, index) => (
              <div
                key={`input-${input.name}-${index}`}
                className="relative flex items-center gap-2"
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${data.type}-input-${index}`}
                  className="!-left-2 !h-3 !w-3 !border-2 !bg-background"
                  style={{ top: `${(index + 1) * 24 + 40}px` }}
                />
                <div className="flex-1">
                  <div className="text-xs">{input.name}</div>
                  <div className="text-muted-foreground text-[10px]">
                    {input.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Outputs */}
        {data.outputs.length > 0 && (
          <div className="space-y-1">
            {data.outputs.map((output, index) => (
              <div
                key={`output-${output.name}-${index}`}
                className="relative flex items-center justify-end gap-2"
              >
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${data.type}-output-${index}`}
                  className="!-right-2 !h-3 !w-3 !border-2 !bg-background"
                  style={{ top: `${(index + 1) * 24 + 40}px` }}
                />
                <div className="flex-1 text-right">
                  <div className="text-xs">{output.name}</div>
                  <div className="text-muted-foreground text-[10px]">
                    {output.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Widget Values (if any) */}
        {data.widgetValues && data.widgetValues.length > 0 && (
          <div className="mt-2 border-t border-border pt-2">
            <div className="text-muted-foreground text-[10px]">
              {data.widgetValues.length} widget value(s)
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const WorkflowNode = memo(WorkflowNodeComponent)
