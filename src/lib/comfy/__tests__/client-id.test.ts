import { beforeEach, describe, expect, it, vi } from "vitest"
import { getComfyClientId } from "../client-id"

describe("getComfyClientId", () => {
  const STORAGE_KEY = "toucan:client-id:v1"

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("generates and persists a new ID if none exists", () => {
    const id = getComfyClientId()
    expect(id).toBeDefined()
    expect(typeof id).toBe("string")
    expect(localStorage.getItem(STORAGE_KEY)).toBe(id)
  })

  it("returns the existing ID if it exists in localStorage", () => {
    const existingId = "existing-test-id"
    localStorage.setItem(STORAGE_KEY, existingId)

    const id = getComfyClientId()
    expect(id).toBe(existingId)
  })

  it("generates a valid ID even if localStorage throws an error", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Security Error")
    })

    const id = getComfyClientId()
    expect(id).toBeDefined()
    expect(typeof id).toBe("string")
  })

  it("works in SSR environment (window is undefined)", () => {
    vi.stubGlobal("window", undefined)

    const id = getComfyClientId()
    expect(id).toBeDefined()
    expect(typeof id).toBe("string")
    // Should not have attempted to use localStorage
  })

  describe("createClientId fallback logic", () => {
    it("uses crypto.randomUUID when available", () => {
      // Ensure we are in a browser-like environment for this test
      if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        const mockUuid = "123e4567-e89b-12d3-a456-426614174000"
        const spy = vi.spyOn(crypto, "randomUUID").mockReturnValue(mockUuid)

        const id = getComfyClientId()
        expect(id).toBe(mockUuid)
        spy.mockRestore()
      }
    })

    it("falls back to custom generator when crypto is unavailable", () => {
      vi.stubGlobal("crypto", undefined)

      const id = getComfyClientId()
      // Fallback format: client-TIMESTAMP-RANDOM
      expect(id).toMatch(/^client-\d+-/)
    })

    it("falls back to custom generator when randomUUID is missing from crypto", () => {
      vi.stubGlobal("crypto", {})

      const id = getComfyClientId()
      expect(id).toMatch(/^client-\d+-/)
    })
  })
})
