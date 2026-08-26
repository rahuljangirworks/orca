import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Store } from '../persistence'

const { setupAutoUpdaterMock, personalForkPolicyMock, createRuntimeMock, flushPendingAsyncMock } =
  vi.hoisted(() => ({
    setupAutoUpdaterMock: vi.fn(),
    personalForkPolicyMock: { firstPartyNetworkEnabled: true },
    createRuntimeMock: vi.fn(),
    flushPendingAsyncMock: vi.fn()
  }))

vi.mock('../updater', () => ({
  ensureAutoUpdaterConfigured: vi.fn(),
  setupAutoUpdater: setupAutoUpdaterMock
}))

vi.mock('../../shared/personal-fork-policy', () => ({
  PERSONAL_FORK_POLICY: personalForkPolicyMock
}))

vi.mock('../persistence', () => ({
  createStore: vi.fn()
}))

vi.mock('./attach-main-window-services-deps', () => ({
  registerPtyHandlers: vi.fn(),
  hydrateLocalPtyRegistryAtBoot: vi.fn()
}))

vi.mock('../browser/browser-manager', () => ({
  getBrowserManager: vi.fn(() => ({ unregisterAll: vi.fn() }))
}))

vi.mock('../macos-tcc-prompt-notice', () => ({
  acknowledgePendingTccPromptNotice: vi.fn(),
  consumePendingTccPromptNotice: vi.fn()
}))

vi.mock('../runtime/runtime-rpc', () => ({
  registerRuntimeWindowLifecycle: vi.fn()
}))

import { attachMainWindowServices } from './attach-main-window-services'

function createMainWindow() {
  type EventHandler = (...args: unknown[]) => void
  const listeners: Record<string, EventHandler[]> = {}
  return {
    isDestroyed: () => false,
    webContents: {
      setWindowOpenHandler: vi.fn(),
      session: {
        setPermissionRequestHandler: vi.fn(),
        setDevicePermissionHandler: vi.fn()
      },
      on: vi.fn((event: string, handler: EventHandler) => {
        listeners[event] = listeners[event] || []
        listeners[event].push(handler)
      })
    },
    once: vi.fn((event: string, handler: EventHandler) => {
      listeners[event] = listeners[event] || []
      listeners[event].push(handler)
    }),
    on: vi.fn((event: string, handler: EventHandler) => {
      listeners[event] = listeners[event] || []
      listeners[event].push(handler)
    }),
    _trigger: (event: string, ...args: unknown[]) => {
      listeners[event]?.forEach((handler) => handler(...args))
    }
  }
}

function createStore(): Store {
  return {
    flushPendingAsync: flushPendingAsyncMock
  } as never
}

function createRuntime() {
  return createRuntimeMock()
}

async function fireReadyToShow(mainWindow: ReturnType<typeof createMainWindow>): Promise<void> {
  const calls = (mainWindow.once as ReturnType<typeof vi.fn>).mock.calls
  const readyToShowHandler = calls.find((call) => call[0] === 'ready-to-show')?.[1]
  if (readyToShowHandler) {
    readyToShowHandler()
    // Why: setupAutoUpdaterDeferred uses setImmediate, so we need to wait for it
    await new Promise((resolve) => setImmediate(resolve))
  }
}

describe('attachMainWindowServices (personal fork)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    personalForkPolicyMock.firstPartyNetworkEnabled = true
  })

  it('does not configure the first-party updater when disabled in personal fork', async () => {
    personalForkPolicyMock.firstPartyNetworkEnabled = false
    const mainWindow = createMainWindow()

    attachMainWindowServices(mainWindow as never, createStore(), createRuntime() as never)
    await fireReadyToShow(mainWindow)

    expect(setupAutoUpdaterMock).not.toHaveBeenCalled()
  })

  it('configures the first-party updater when enabled', async () => {
    personalForkPolicyMock.firstPartyNetworkEnabled = true
    const mainWindow = createMainWindow()

    attachMainWindowServices(mainWindow as never, createStore(), createRuntime() as never)
    await fireReadyToShow(mainWindow)

    expect(setupAutoUpdaterMock).toHaveBeenCalled()
  })
})
