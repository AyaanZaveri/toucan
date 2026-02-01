"use client"

import { useReactFlow } from "@xyflow/react"
import { Lock, Maximize2, Unlock, ZoomIn, ZoomOut } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

export function GraphControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const [isLocked, setIsLocked] = useState(false)

  const handleZoomIn = () => {
    zoomIn({ duration: 200 })
  }

  const handleZoomOut = () => {
    zoomOut({ duration: 200 })
  }

  const handleFitView = () => {
    fitView({ padding: 0.2, duration: 200 })
  }

  const handleToggleLock = () => {
    setIsLocked(!isLocked)
  }

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <ButtonGroup orientation="vertical">
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleFitView}
          title="Fit View"
          aria-label="Fit View"
        >
          <Maximize2 className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleToggleLock}
          title={isLocked ? "Unlock" : "Lock"}
          aria-label={isLocked ? "Unlock" : "Lock"}
        >
          {isLocked ? (
            <Lock className="size-4" />
          ) : (
            <Unlock className="size-4" />
          )}
        </Button>
      </ButtonGroup>
    </div>
  )
}
