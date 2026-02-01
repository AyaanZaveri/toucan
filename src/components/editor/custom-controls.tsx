"use client"

import {
  FullScreenIcon,
  MinusSignIcon,
  PlusSignIcon,
  SquareLock02Icon,
  SquareUnlock02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useReactFlow } from "@xyflow/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function CustomControls() {
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
      <ButtonGroup orientation="vertical" className="backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              aria-label="Zoom In"
            >
              <HugeiconsIcon
                icon={PlusSignIcon}
                strokeWidth={2}
                className="size-4"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Zoom In</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              aria-label="Zoom Out"
            >
              <HugeiconsIcon
                icon={MinusSignIcon}
                strokeWidth={2}
                className="size-4"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Zoom Out</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleFitView}
              aria-label="Fit View"
            >
              <HugeiconsIcon
                icon={FullScreenIcon}
                strokeWidth={2}
                className="size-4"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Fit View</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleLock}
              aria-label={isLocked ? "Unlock" : "Lock"}
            >
              {isLocked ? (
                <HugeiconsIcon
                  icon={SquareLock02Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              ) : (
                <HugeiconsIcon
                  icon={SquareUnlock02Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isLocked ? "Unlock" : "Lock"}
          </TooltipContent>
        </Tooltip>
      </ButtonGroup>
    </div>
  )
}
