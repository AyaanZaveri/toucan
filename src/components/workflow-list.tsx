"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getWorkflowByPath } from "@/lib/workflows/actions"
import type {
  WorkflowDefinition,
  WorkflowFileInfo,
} from "@/lib/workflows/types"
import { WorkflowViewer } from "./workflow-viewer"

interface WorkflowListProps {
  workflows: WorkflowFileInfo[]
}

/**
 * WorkflowList displays a list of workflows and allows viewing them
 */
export function WorkflowList({ workflows }: WorkflowListProps) {
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowDefinition | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleViewWorkflow = async (path: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getWorkflowByPath(path)

      if (result.ok) {
        setSelectedWorkflow(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflow")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <div
            key={workflow.path}
            className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
          >
            <div className="space-y-2">
              <div className="font-semibold text-sm">{workflow.path}</div>
              <div className="space-y-1 text-muted-foreground text-xs">
                <div>Size: {formatSize(workflow.size)}</div>
                <div>Modified: {formatDate(workflow.modified)}</div>
                <div>Created: {formatDate(workflow.created)}</div>
              </div>
              <Button
                onClick={() => handleViewWorkflow(workflow.path)}
                disabled={isLoading}
                className="w-full"
                size="sm"
              >
                {isLoading ? "Loading..." : "View Workflow"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow Viewer Dialog */}
      <Dialog
        open={selectedWorkflow !== null}
        onOpenChange={(open) => !open && setSelectedWorkflow(null)}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh]">
          <DialogHeader>
            <DialogTitle>Workflow Viewer</DialogTitle>
            <DialogDescription>
              {selectedWorkflow && `Viewing workflow: ${selectedWorkflow.id}`}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          )}
          {selectedWorkflow && (
            <div className="flex-1 overflow-hidden">
              <WorkflowViewer workflow={selectedWorkflow} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
