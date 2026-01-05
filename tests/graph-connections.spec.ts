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
