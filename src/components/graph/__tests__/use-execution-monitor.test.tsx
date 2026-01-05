import { act, renderHook, waitFor } from "@testing-library/react"
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { useExecutionMonitor } from "@/components/graph/use-execution-monitor"

vi.mock("@/lib/comfy/client-id", () => ({
  getComfyClientId: () => "client-123",
}))

vi.mock("@/lib/comfy/inference", () => ({
  interruptPrompt: vi.fn().mockResolvedValue({ ok: true }),
}))

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  readyState = 1
  send = vi.fn()
  close = vi.fn()
  private listeners: Map<string, Set<(event: MessageEvent) => void>> = new Map()

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)?.add(listener)
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener)
  }

  emit(type: string, event: MessageEvent) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

const sendMessage = (socket: MockWebSocket, payload: unknown) => {
  socket.emit("message", { data: JSON.stringify(payload) } as MessageEvent)
}

const getSocket = async () => {
  await waitFor(() => expect(MockWebSocket.instances.length).toBe(1))
  return MockWebSocket.instances[0]
}

describe("useExecutionMonitor", () => {
  const originalWebSocket = globalThis.WebSocket

  beforeAll(() => {
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket
  })

  afterAll(() => {
    globalThis.WebSocket = originalWebSocket
  })

  beforeEach(() => {
    MockWebSocket.instances = []
    vi.clearAllMocks()
  })

  it("tracks queue remaining updates and preserves it when queued", async () => {
    const { result } = renderHook(() =>
      useExecutionMonitor({ apiBase: "http://localhost:8188" }),
    )

    const socket = await getSocket()

    act(() => {
      sendMessage(socket, {
        type: "status",
        data: { status: { exec_info: { queue_remaining: 3 } } },
      })
    })

    expect(result.current.state.queueRemaining).toBe(3)

    act(() => {
      result.current.markPromptQueued("prompt-1")
    })

    expect(result.current.state.phase).toBe("queued")
    expect(result.current.state.promptId).toBe("prompt-1")
    expect(result.current.state.queueRemaining).toBe(3)
  })

  it("handles execution start, executing, and executed outputs", async () => {
    const { result } = renderHook(() =>
      useExecutionMonitor({ apiBase: "http://localhost:8188" }),
    )

    const socket = await getSocket()

    act(() => {
      sendMessage(socket, {
        type: "execution_start",
        data: { prompt_id: "prompt-1", timestamp: 123 },
      })
    })

    expect(result.current.state.phase).toBe("running")
    expect(result.current.state.promptId).toBe("prompt-1")
    expect(result.current.state.startedAt).toBe(123)

    act(() => {
      sendMessage(socket, {
        type: "executing",
        data: { node: "1", display_node: "display-1" },
      })
    })

    expect(result.current.state.currentNodeId).toBe("display-1")
    expect(result.current.state.nodeStatuses["display-1"]).toBe("running")

    act(() => {
      sendMessage(socket, {
        type: "executed",
        data: {
          node: "1",
          output: {
            images: [
              { filename: "image.png", subfolder: "out", type: "image" },
            ],
          },
        },
      })
    })

    expect(result.current.state.nodeStatuses["display-1"]).toBe("completed")
    expect(result.current.state.nodeOutputs["display-1"]?.images).toHaveLength(
      1,
    )

    act(() => {
      sendMessage(socket, {
        type: "executed",
        data: { node: "1", output: { images: [] } },
      })
    })

    expect(result.current.state.nodeOutputs["display-1"]).toBeUndefined()
  })

  it("tracks progress events and preserves cached status", async () => {
    const { result } = renderHook(() =>
      useExecutionMonitor({ apiBase: "http://localhost:8188" }),
    )

    const socket = await getSocket()

    act(() => {
      sendMessage(socket, {
        type: "execution_cached",
        data: { nodes: ["node-1"] },
      })
    })

    act(() => {
      sendMessage(socket, {
        type: "progress_state",
        data: {
          nodes: {
            "0": {
              node_id: "node-1",
              state: "finished",
              value: 2,
              max: 5,
            },
          },
        },
      })
    })

    expect(result.current.state.nodeStatuses["node-1"]).toBe("cached")
    expect(result.current.state.nodeProgress["node-1"]).toEqual({
      value: 2,
      max: 5,
    })

    act(() => {
      sendMessage(socket, {
        type: "progress",
        data: { node: "node-2", value: 1, max: 4 },
      })
    })

    expect(result.current.state.nodeProgress["node-2"]).toEqual({
      value: 1,
      max: 4,
    })
  })

  it("records errors and interruption states", async () => {
    const { result } = renderHook(() =>
      useExecutionMonitor({ apiBase: "http://localhost:8188" }),
    )

    const socket = await getSocket()

    act(() => {
      sendMessage(socket, {
        type: "execution_error",
        data: { node_id: "node-9", exception_message: "boom" },
      })
    })

    expect(result.current.state.phase).toBe("error")
    expect(result.current.state.currentNodeId).toBeNull()
    expect(result.current.state.nodeStatuses["node-9"]).toBe("error")
    expect(result.current.state.nodeErrors["node-9"]).toBe("boom")

    act(() => {
      sendMessage(socket, {
        type: "execution_interrupted",
        data: { node_id: "node-10" },
      })
    })

    expect(result.current.state.phase).toBe("interrupted")
    expect(result.current.state.nodeStatuses["node-10"]).toBe("interrupted")
  })
})
