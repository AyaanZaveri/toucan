import {
  Handle,
  type Node,
  type NodeProps,
  Position,
  useConnection,
} from "@xyflow/react"
import { useMemo } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import type {
  BaseNodeData,
  PromptNodeData,
  SettingsNodeData,
} from "@/lib/graph-converter"
import type { WorkflowNodeData } from "@/lib/workflows/converter"
import { useNodeDataUpdate } from "@/components/editor/node-data-context"

/**
 * ComfyUI Node - displays inputs and outputs with handles
 */
export function ComfyNode({ data, id }: NodeProps<Node<WorkflowNodeData>>) {
  // Get node data update function
  const updateNodeData = useNodeDataUpdate()

  // Get connection state using the useConnection hook
  const connection = useConnection()

  // Determine if a connection is in progress and get the source type
  const { isConnecting, connectingType, isConnectingFromSource } =
    useMemo(() => {
      if (
        !connection.inProgress ||
        !connection.fromHandle ||
        !connection.fromHandle.id
      ) {
        return {
          isConnecting: false,
          connectingType: null,
          isConnectingFromSource: false,
        }
      }

      // Extract the index from handle ID (format: "nodeId-output-idx" or "nodeId-input-idx")
      const handleId = connection.fromHandle.id
      const handleIdParts = handleId.split("-")
      const handleIdx = Number.parseInt(handleIdParts.pop() || "-1", 10)
      const handleKind = handleIdParts.pop() // "input" or "output"

      if (handleIdx < 0) {
        return {
          isConnecting: false,
          connectingType: null,
          isConnectingFromSource: false,
        }
      }

      // Check if the connection is from this node
      const isConnectingFromThisNode = connection.fromNode.id === id

      let type: string | null = null
      const isSource = connection.fromHandle.type === "source"

      if (isConnectingFromThisNode) {
        // Connection is from this node - get the type from our data
        if (handleKind === "output" && data.outputs?.[handleIdx]) {
          type = data.outputs[handleIdx].type.toLowerCase()
        } else if (handleKind === "input" && data.inputs?.[handleIdx]) {
          type = data.inputs[handleIdx].type.toLowerCase()
        }
      } else {
        // Connection is from another node - need to extract type from fromNode data
        const fromNodeData = connection.fromNode.data as WorkflowNodeData
        if (handleKind === "output" && fromNodeData.outputs?.[handleIdx]) {
          type = fromNodeData.outputs[handleIdx].type.toLowerCase()
        } else if (handleKind === "input" && fromNodeData.inputs?.[handleIdx]) {
          type = fromNodeData.inputs[handleIdx].type.toLowerCase()
        }
      }

      return {
        isConnecting: true,
        connectingType: type,
        isConnectingFromSource: isSource,
      }
    }, [connection, id, data])

  // Helper to check if a handle is valid for the current connection
  const isHandleValid = (handleType: string, isSourceHandle: boolean) => {
    if (!isConnecting || !connectingType) return true

    // Prevent input→input or output→output
    if (isConnectingFromSource === isSourceHandle) return false

    // Check type compatibility (case-insensitive)
    return handleType.toLowerCase() === connectingType
  }

  return (
    <div className="shadow-2xl shadow-accent/25 rounded-lg bg-card border border-border min-w-[200px] max-w-[400px]">
      {/* Node Header */}
      <div className="px-3 py-2 bg-muted border-b border-border rounded-t-lg">
        <div className="font-semibold text-sm text-card-foreground">
          {data.label}
        </div>
        <div className="text-xs text-muted-foreground">{data.type}</div>
      </div>

      {/* Node Body */}
      <div className="px-3 py-2">
        {/* Inputs */}
        {data.inputs && data.inputs.length > 0 && (
          <div className="space-y-2 mb-2">
            {data.inputs.map((input, idx) => {
              // If input has a link, it's connected and shouldn't show a widget
              const hasLink =
                (input as any).link !== null &&
                (input as any).link !== undefined

              // Widget values are only for inputs that have a widget property AND no link
              const hasWidget = (input as any).widget !== undefined
              const widgetValue =
                hasWidget &&
                !hasLink &&
                data.widgetValues &&
                typeof data.widgetValues === "object" &&
                !Array.isArray(data.widgetValues)
                  ? data.widgetValues[input.name]
                  : undefined

              const inputType = input.type?.toLowerCase()
              const isTextInput = inputType === "string"
              const isComboInput = inputType === "combo"
              const showTextarea = isTextInput && widgetValue !== undefined
              const showDropdown = isComboInput && widgetValue !== undefined

              // Determine if this handle should appear disabled
              const handleValid = isHandleValid(input.type, false)
              const handleClassName = `!w-3 !h-3 !bg-primary !ring-2 !ring-primary/50 !border-accent shadow- shadow-primary ${
                !handleValid ? "opacity-30" : ""
              }`

              if (showTextarea) {
                // Render textarea for text/STRING inputs
                return (
                  <div key={`input-${idx}`} className="relative">
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={`${id}-input-${idx}`}
                      className={handleClassName}
                      style={{ top: 12, left: -12 }}
                    />
                    <div className="mb-1">
                      <div className="text-xs text-card-foreground">
                        {input.name}
                      </div>
                    </div>
                    <Textarea
                      value={String(widgetValue ?? "")}
                      onChange={(e) => {
                        const newValue = e.target.value
                        const existingWidgetValues =
                          data.widgetValues &&
                          typeof data.widgetValues === "object" &&
                          !Array.isArray(data.widgetValues)
                            ? data.widgetValues
                            : {}
                        
                        // Debug log to confirm updates
                        console.log(`[Widget Update] Node ${id}, ${input.name}:`, newValue)
                        
                        updateNodeData(id, {
                          widgetValues: {
                            ...existingWidgetValues,
                            [input.name]: newValue,
                          },
                        })
                      }}
                      className="text-xs resize-none mt-2"
                    />
                  </div>
                )
              }

              if (showDropdown) {
                // TODO: Add proper COMBO options list from ComfyUI objectInfo
                // For now, wire up the onChange handler for when options are available
                const comboOptions = (input as any).widget?.values ? [(input as any).widget.values] : [widgetValue]
                
                return (
                  <div key={`input-${idx}`} className="relative">
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={`${id}-input-${idx}`}
                      className={handleClassName}
                      style={{ top: 12, left: -12 }}
                    />
                    <div className="mb-1">
                      <div className="text-xs text-card-foreground">
                        {input.name}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-full border border-input bg-transparent px-2.5 py-2 text-xs text-left mt-1">
                        {String(widgetValue)}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {comboOptions.map((option, optIdx) => (
                          <DropdownMenuItem
                            key={optIdx}
                            onSelect={() => {
                              const existingWidgetValues =
                                data.widgetValues &&
                                typeof data.widgetValues === "object" &&
                                !Array.isArray(data.widgetValues)
                                  ? data.widgetValues
                                  : {}
                              
                              // Debug log to confirm updates
                              console.log(`[Widget Update] Node ${id}, ${input.name}:`, option)
                              
                              updateNodeData(id, {
                                widgetValues: {
                                  ...existingWidgetValues,
                                  [input.name]: option,
                                },
                              })
                            }}
                          >
                            {String(option)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              }

              // Render normal input without widget
              return (
                <div
                  key={`input-${idx}`}
                  className="relative flex items-center gap-2"
                >
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`${id}-input-${idx}`}
                    className={handleClassName}
                    style={{ top: "auto", left: -12 }}
                  />
                  <div className="flex-1">
                    <div className="text-xs text-card-foreground">
                      {input.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {input.type}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Widget Values - only show for non-text/non-combo inputs */}
        {data.widgetValues &&
          typeof data.widgetValues === "object" &&
          !Array.isArray(data.widgetValues) && (
            <div className="mt-2">
              {Object.entries(data.widgetValues).map(([inputName, value]) => {
                // Find which input this widget belongs to
                const correspondingInput = data.inputs?.find(
                  (inp: any) => inp.name === inputName && inp.widget,
                )

                if (!correspondingInput) return null

                const inputType = correspondingInput.type?.toLowerCase()
                const isTextInput = inputType === "string"
                const isComboInput = inputType === "combo"
                if (isTextInput || isComboInput) return null

                return (
                  <div
                    key={`widget-${inputName}`}
                    className="text-xs text-muted-foreground truncate"
                  >
                    {typeof value === "string"
                      ? value.length > 50
                        ? `${value.slice(0, 50)}...`
                        : value
                      : JSON.stringify(value)}
                  </div>
                )
              })}
            </div>
          )}

        {/* Outputs */}
        {data.outputs && data.outputs.length > 0 && (
          <div className="space-y-1 mt-4">
            {data.outputs.map((output, idx) => {
              // Determine if this handle should appear disabled
              const handleValid = isHandleValid(output.type, true)
              const handleClassName = `!w-3 !h-3 !bg-primary !ring-2 !ring-primary/50 !border-accent shadow- shadow-primary ${
                !handleValid ? "opacity-30" : ""
              }`

              return (
                <div
                  key={`output-${idx}`}
                  className="relative flex items-center justify-end gap-2"
                >
                  <div className="flex-1 text-right">
                    <div className="text-xs text-card-foreground">
                      {output.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {output.type}
                    </div>
                  </div>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`${id}-output-${idx}`}
                    className={handleClassName}
                    style={{ top: "auto", right: -12 }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Default node - simple title with input/output handles
 */
export function DefaultNode({ data }: NodeProps<Node<BaseNodeData>>) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-card border-2 border-border min-w-[150px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="font-bold text-sm text-card-foreground">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

/**
 * Settings node - title + label/value rows
 */
export function SettingsNode({ data }: NodeProps<Node<SettingsNodeData>>) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-card border-2 border-primary min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="font-bold text-sm mb-2 text-card-foreground">
        {data.label}
      </div>
      {data.settings && data.settings.length > 0 && (
        <div className="space-y-1">
          {data.settings.map((setting, idx) => (
            <div key={idx} className="flex justify-between text-xs gap-2">
              <span className="text-muted-foreground">{setting.label}:</span>
              <span className="font-medium text-card-foreground">
                {setting.value}
              </span>
            </div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

/**
 * Prompt node - title + multiline textarea display
 */
export function PromptNode({ data }: NodeProps<Node<PromptNodeData>>) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-card border-2 border-primary min-w-[250px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="font-bold text-sm mb-2 text-card-foreground">
        {data.label}
      </div>
      {data.prompt && (
        <div className="text-xs text-card-foreground whitespace-pre-wrap max-w-[300px] max-h-[200px] overflow-auto">
          {data.prompt}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

/**
 * Export node types for ReactFlow
 */
export const editorNodeTypes = {
  default: DefaultNode,
  settings: SettingsNode,
  prompt: PromptNode,
  workflow: ComfyNode,
}
