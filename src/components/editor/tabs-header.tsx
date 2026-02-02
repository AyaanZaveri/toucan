"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface TabItem {
  id: string
  title: string
  hasUnsavedChanges?: boolean
}

export interface AvailableWorkflow {
  path: string
  name: string
}

interface TabsHeaderProps {
  tabs: TabItem[]
  activeTabId: string
  onTabChange: (tabId: string) => void
  availableWorkflows?: AvailableWorkflow[]
  onOpenWorkflow?: (workflow: AvailableWorkflow) => void
  children: (tabId: string) => React.ReactNode
}

/**
 * TabsHeader renders the shadcn/ui tabs component
 * Manages tab switching without any graph logic
 */
export function TabsHeader({
  tabs,
  activeTabId,
  onTabChange,
  availableWorkflows = [],
  onOpenWorkflow,
  children,
}: TabsHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  if (tabs.length === 0) {
    return null
  }

  // Filter out workflows that are already open
  const unopenedWorkflows = availableWorkflows.filter(
    (workflow) => !tabs.some((tab) => tab.id === workflow.path),
  )

  const handleOpenWorkflow = (workflow: AvailableWorkflow) => {
    onOpenWorkflow?.(workflow)
    setDialogOpen(false)
  }

  return (
    <Tabs
      value={activeTabId}
      onValueChange={onTabChange}
      className="flex flex-col flex-1"
    >
      <TabsList
        variant="line"
        className="w-full justify-start rounded-none !pt-0 !h-10 border-b gap-0"
      >
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="hover:bg-accent">
            <span className="flex items-center gap-1.5">
              {tab.title}
              {tab.hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </span>
          </TabsTrigger>
        ))}
        {unopenedWorkflows.length > 0 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="px-6 mr-1.5">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Open Workflow</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                {unopenedWorkflows.map((workflow) => (
                  <Button
                    key={workflow.path}
                    variant="outline"
                    onClick={() => handleOpenWorkflow(workflow)}
                    className="justify-start"
                  >
                    {workflow.name}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="flex-1 h-full">
          {children(tab.id)}
        </TabsContent>
      ))}
    </Tabs>
  )
}
