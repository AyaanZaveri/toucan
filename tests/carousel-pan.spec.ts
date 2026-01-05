import { expect, test } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:6006"

test("dragging the carousel does not pan the React Flow viewport", async ({
  page,
}) => {
  await page.goto(`${baseURL}/iframe.html?id=graph-comfynode--output-carousel`)

  const viewport = page.locator(".react-flow__viewport")
  const carousel = page.locator('[data-slot="carousel-content"]')

  await expect(viewport).toBeVisible()
  await expect(carousel).toBeVisible()

  const initialTransform = await viewport.evaluate(
    (element) => getComputedStyle(element).transform,
  )

  const box = await carousel.boundingBox()
  if (!box) {
    throw new Error("Carousel content did not render a bounding box")
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 120, startY, { steps: 8 })
  await page.mouse.up()

  const finalTransform = await viewport.evaluate(
    (element) => getComputedStyle(element).transform,
  )

  expect(finalTransform).toBe(initialTransform)
})
