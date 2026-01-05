import { expect, test } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:6006"

test("dragging a handle creates a connection", async ({ page }) => {
  await page.goto(
    `${baseURL}/iframe.html?id=graph-connections--connection-handles`,
  )

  const sourceHandle = page.locator('[data-handleid="out-image"]')
  const targetHandle = page.locator('[data-handleid="in-image"]')

  await expect(sourceHandle).toBeVisible()
  await expect(targetHandle).toBeVisible()

  const sourceBox = await sourceHandle.boundingBox()
  const targetBox = await targetHandle.boundingBox()

  if (!sourceBox || !targetBox) {
    throw new Error("Connection handles did not render bounding boxes")
  }

  const sourceX = sourceBox.x + sourceBox.width / 2
  const sourceY = sourceBox.y + sourceBox.height / 2
  const targetX = targetBox.x + targetBox.width / 2
  const targetY = targetBox.y + targetBox.height / 2

  await page.mouse.move(sourceX, sourceY)
  await page.mouse.down()
  await page.mouse.move(targetX, targetY, { steps: 12 })
  await page.mouse.up()

  await expect(page.locator(".react-flow__edge")).toHaveCount(1)
})

test("connection autosnaps to the first compatible slot when hovering a node", async ({
  page,
}) => {
  await page.goto(
    `${baseURL}/iframe.html?id=graph-connections--connection-handles`,
  )

  const sourceHandle = page.locator('[data-handleid="out-image"]')
  const targetHandle = page.locator('[data-handleid="in-image"]')
  const targetNode = page.locator('[data-id="target-node-1"]')

  await expect(sourceHandle).toBeVisible()
  await expect(targetHandle).toBeVisible()
  await expect(targetNode).toBeVisible()

  const sourceBox = await sourceHandle.boundingBox()
  const targetNodeBox = await targetNode.boundingBox()

  if (!sourceBox || !targetNodeBox) {
    throw new Error("Connection handles or nodes did not render bounding boxes")
  }

  const sourceX = sourceBox.x + sourceBox.width / 2
  const sourceY = sourceBox.y + sourceBox.height / 2
  const hoverX = targetNodeBox.x + targetNodeBox.width * 0.75
  const hoverY = targetNodeBox.y + targetNodeBox.height * 0.5

  await page.mouse.move(sourceX, sourceY)
  await page.mouse.down()
  await page.mouse.move(hoverX, hoverY, { steps: 12 })

  await expect(page.locator(".react-flow__connection-path")).toBeVisible()

  const snapInfo = await page.evaluate(() => {
    const path = document.querySelector(
      ".react-flow__connection-path",
    ) as SVGPathElement | null
    const handle = document.querySelector(
      '[data-handleid="in-image"]',
    ) as HTMLElement | null

    if (!path || !handle) {
      return null
    }

    const handleRect = handle.getBoundingClientRect()
    const handleCenter = {
      x: handleRect.left + handleRect.width / 2,
      y: handleRect.top + handleRect.height / 2,
    }

    const length = path.getTotalLength()
    const endPoint = path.getPointAtLength(length)
    const matrix = path.getScreenCTM()
    const screenPoint = matrix
      ? new DOMPoint(endPoint.x, endPoint.y).matrixTransform(matrix)
      : new DOMPoint(endPoint.x, endPoint.y)

    const distance = Math.hypot(
      screenPoint.x - handleCenter.x,
      screenPoint.y - handleCenter.y,
    )

    return {
      distance,
      handleCenter,
      endPoint: { x: screenPoint.x, y: screenPoint.y },
    }
  })

  if (!snapInfo) {
    throw new Error("Could not resolve connection line or target handle")
  }

  const isWebKit = test.info().project.name.toLowerCase().includes("webkit")

  if (!isWebKit) {
    // WebKit's SVG getScreenCTM/getPointAtLength math is unreliable under CSS transforms.
    expect(snapInfo.distance).toBeLessThan(12)
  }

  await page.mouse.up()
  await expect(page.locator(".react-flow__edge")).toHaveCount(1)
})
