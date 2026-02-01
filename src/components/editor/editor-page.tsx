"use client"

import type { Edge, Node } from "@xyflow/react"
import { useCallback, useEffect, useState } from "react"
import { AppSidebar } from "@/components/editor/app-sidebar"
import { FlowCanvas } from "@/components/editor/flow-canvas"
import { TabsHeader } from "@/components/editor/tabs-header"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { parseJsonToReactFlow } from "@/lib/graph-converter"
import { getWorkflowByPath, getWorkflowList } from "@/lib/workflows/actions"
import type {
  WorkflowDefinition,
  WorkflowFileInfo,
} from "@/lib/workflows/types"

export interface OpenTab {
  id: string
  title: string
  fileRef: { path: string; name: string }
  graph: { nodes: Node[]; edges: Edge[] } | null
  parseError?: string
  hasUnsavedChanges?: boolean
  originalWorkflow?: WorkflowDefinition
}

export function EditorPage() {
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [allWorkflows, setAllWorkflows] = useState<WorkflowFileInfo[]>([])

  useEffect(() => {
    loadWorkspaceFiles()
  }, [loadWorkspaceFiles])

  const handleSave = useCallback(async () => {
    const activeTab = tabs.find((tab) => tab.id === activeTabId)
    if (
      !activeTab ||
      !activeTab.originalWorkflow ||
      !activeTab.hasUnsavedChanges ||
      isSaving
    ) {
      return
    }

    setIsSaving(true)
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_COMFY_API_BASE_URL || "http://127.0.0.1:8188"
      const fullPath = `workflows/${activeTab.fileRef.name}`
      const encodedPath = encodeURIComponent(fullPath)
      const url = `${baseUrl}/api/userdata/${encodedPath}?overwrite=true&full_info=true`

      console.log("[handleSave] Saving to:", url)
      console.log("[handleSave] Payload:", activeTab.originalWorkflow)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body: JSON.stringify(activeTab.originalWorkflow),
      })

      console.log(
        "[handleSave] Response status:",
        response.status,
        response.statusText,
      )

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        console.error("[handleSave] Error response:", text)
        console.error(
          "Failed to save workflow:",
          response.status,
          response.statusText,
        )
        return
      }

      const responseText = await response.text().catch(() => "")
      console.log("[handleSave] Success response:", responseText)

      // Clear the unsaved changes flag
      setTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.id === activeTabId ? { ...tab, hasUnsavedChanges: false } : tab,
        ),
      )
      console.log("Workflow saved successfully")
    } catch (error) {
      console.error("Error saving workflow:", error)
    } finally {
      setIsSaving(false)
    }
  }, [activeTabId, tabs, isSaving])

  // Keyboard shortcut for saving (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault()
        handleSave()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleSave])

  const markTabAsUnsaved = useCallback((tabId: string) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === tabId ? { ...tab, hasUnsavedChanges: true } : tab,
      ),
    )
  }, [])

  const handleOpenWorkflow = useCallback(
    async (workflow: { path: string; name: string }) => {
      // Check if already open
      if (tabs.some((tab) => tab.id === workflow.path)) {
        setActiveTabId(workflow.path)
        return
      }

      try {
        const workflowResult = await getWorkflowByPath(workflow.name)

        if (!workflowResult.ok) {
          console.error("Failed to load workflow:", workflowResult.error)
          return
        }

        const workflowData = workflowResult.data
        console.log("Loaded workflow data:", workflowData)
        const result = parseJsonToReactFlow(JSON.stringify(workflowData))

        let newTab: OpenTab
        if ("error" in result) {
          newTab = {
            id: workflow.path,
            title: workflow.name,
            fileRef: { path: workflow.path, name: workflow.name },
            graph: null,
            parseError: result.error,
            hasUnsavedChanges: false,
          }
        } else {
          newTab = {
            id: workflow.path,
            title: workflow.name,
            fileRef: { path: workflow.path, name: workflow.name },
            graph: result,
            hasUnsavedChanges: false,
            originalWorkflow: workflowData,
          }
        }

        setTabs((prevTabs) => [...prevTabs, newTab])
        setActiveTabId(newTab.id)
      } catch (error) {
        console.error("Error opening workflow:", error)
      }
    },
    [tabs],
  )

  async function loadWorkspaceFiles() {
    try {
      const workflowsResult = await getWorkflowList()

      if (!workflowsResult.ok) {
        console.error("Failed to load workflows:", workflowsResult.error)
        setIsLoading(false)
        return
      }

      const workflows = workflowsResult.data
      setAllWorkflows(workflows)

      console.log("Loaded workflows:", workflows)

      if (workflows.length === 0) {
        setIsLoading(false)
        return
      }

      const firstWorkflow = workflows[0]
      // Extract just the filename from the full path (e.g., "workflows/alpaca.json" -> "alpaca.json")
      const filename = firstWorkflow.path.split("/").pop() || firstWorkflow.path
      const workflowResult = await getWorkflowByPath(filename)

      if (!workflowResult.ok) {
        console.error("Failed to load workflow:", workflowResult.error)
        setIsLoading(false)
        return
      }

      const workflowData = workflowResult.data

      console.log("Loaded workflow data:", workflowData)

      const result = parseJsonToReactFlow(JSON.stringify(workflowData))

      let tab: OpenTab
      if ("error" in result) {
        tab = {
          id: firstWorkflow.path,
          title: filename,
          fileRef: { path: firstWorkflow.path, name: filename },
          graph: null,
          parseError: result.error,
          hasUnsavedChanges: false,
        }
      } else {
        tab = {
          id: firstWorkflow.path,
          title: filename,
          fileRef: { path: firstWorkflow.path, name: filename },
          graph: result,
          hasUnsavedChanges: false,
          originalWorkflow: workflowData,
        }
      }

      setTabs([tab])
      setActiveTabId(tab.id)
    } catch (error) {
      console.error("Failed to load workspace files:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading workspace...</p>
      </div>
    )
  }

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            No JSON files found in workspace.
          </h2>
          <p className="text-muted-foreground">
            Add a JSON workflow file to get started.
          </p>
        </div>
      </div>
    )
  }

  const _activeTab = tabs.find((tab) => tab.id === activeTabId)
  const showSaveButton = false

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen">
        {showSaveButton && (
          <div className="absolute top-2 right-4 z-10">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              variant="default"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
        <TabsHeader
          tabs={tabs.map((t) => ({
            id: t.id,
            title: t.title,
            hasUnsavedChanges: t.hasUnsavedChanges,
          }))}
          activeTabId={activeTabId}
          onTabChange={setActiveTabId}
          availableWorkflows={allWorkflows.map((w) => ({
            path: w.path,
            name: w.path.split("/").pop() || w.path,
          }))}
          onOpenWorkflow={handleOpenWorkflow}
        >
          {(tabId) => {
            const tab = tabs.find((t) => t.id === tabId)
            if (!tab) return null

            if (tab.parseError) {
              return (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <h3 className="text-lg font-semibold mb-2">
                      Could not parse {tab.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {tab.parseError}
                    </p>
                  </div>
                </div>
              )
            }

            if (!tab.graph) {
              return (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">
                    No graph data available
                  </p>
                </div>
              )
            }

            return (
              <FlowCanvas
                nodes={tab.graph.nodes}
                edges={tab.graph.edges}
                onGraphChange={() => markTabAsUnsaved(tabId)}
              />
            )
          }}
        </TabsHeader>
      </SidebarInset>
    </SidebarProvider>
  )
}
