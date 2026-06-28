import { contextBridge, ipcRenderer } from 'electron'
import type { Settings, OllamaChatMessage } from '../shared/types'

contextBridge.exposeInMainWorld('nestor', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized')
  },
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('app:get-settings'),
    set: (patch: Partial<Settings>): Promise<void> => ipcRenderer.invoke('app:set-settings', patch),
    selectFolder: (): Promise<string | null> => ipcRenderer.invoke('app:select-folder')
  },
  fs: {
    listDir: (path: string) => ipcRenderer.invoke('fs:list-dir', { path }),
    readFile: (path: string) => ipcRenderer.invoke('fs:read-file', { path }),
    createFolder: (path: string) => ipcRenderer.invoke('fs:create-folder', { path }),
    copyFile: (from: string, to: string) => ipcRenderer.invoke('fs:copy-file', { from, to }),
    moveFile: (from: string, to: string) => ipcRenderer.invoke('fs:move-file', { from, to }),
    renameFile: (path: string, newName: string) =>
      ipcRenderer.invoke('fs:rename-file', { path, newName }),
    deleteFile: (path: string) => ipcRenderer.invoke('fs:delete-file', { path }),
    undo: (id: string) => ipcRenderer.invoke('fs:undo', { id }),
    search: (rootPath: string, query: string) =>
      ipcRenderer.invoke('fs:search', { rootPath, query }),
    writeFile: (path: string, content: string) =>
      ipcRenderer.invoke('fs:write-file', { path, content }),
    createFile: (path: string) => ipcRenderer.invoke('fs:create-file', { path }),
    onChanged: (cb: (rootPath: string) => void) => {
      const handler = (_: unknown, p: string) => cb(p)
      ipcRenderer.on('fs:changed', handler)
      return () => ipcRenderer.removeListener('fs:changed', handler)
    }
  },
  shell: {
    openPath: (path: string) => ipcRenderer.invoke('shell:open-path', { path }),
    showInFolder: (path: string) => ipcRenderer.invoke('shell:show-in-folder', { path }),
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', { url })
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
    getSpecialFolders: (): Promise<{ desktop: string; downloads: string; documents: string }> =>
      ipcRenderer.invoke('app:get-special-folders'),
    getStartup: (): Promise<boolean> => ipcRenderer.invoke('app:get-startup'),
    setStartup: (enabled: boolean): Promise<void> => ipcRenderer.invoke('app:set-startup', enabled)
  },
  ollama: {
    check: () => ipcRenderer.invoke('ollama:check'),
    models: () => ipcRenderer.invoke('ollama:models'),
    testApi: (apiKey: string, baseUrl: string): Promise<{ ok: boolean; message: string }> =>
      ipcRenderer.invoke('ollama:test-api', { apiKey, baseUrl }),
    chat: (messages: OllamaChatMessage[], systemPrompt: string, model?: string) =>
      ipcRenderer.invoke('ollama:chat', { messages, systemPrompt, model }),
    onStart: (cb: () => void) => {
      const h = () => cb()
      ipcRenderer.on('ollama:start', h)
      return () => ipcRenderer.removeListener('ollama:start', h)
    },
    onToken: (cb: (token: string) => void) => {
      const h = (_: unknown, t: string) => cb(t)
      ipcRenderer.on('ollama:token', h)
      return () => ipcRenderer.removeListener('ollama:token', h)
    },
    onDone: (cb: () => void) => {
      const h = () => cb()
      ipcRenderer.on('ollama:done', h)
      return () => ipcRenderer.removeListener('ollama:done', h)
    },
    onError: (cb: (msg: string) => void) => {
      const h = (_: unknown, m: string) => cb(m)
      ipcRenderer.on('ollama:error', h)
      return () => ipcRenderer.removeListener('ollama:error', h)
    }
  },
  history: {
    get: () => ipcRenderer.invoke('history:get'),
    onUpdated: (cb: (items: unknown[]) => void) => {
      const h = (_: unknown, items: unknown[]) => cb(items)
      ipcRenderer.on('history:updated', h)
      return () => ipcRenderer.removeListener('history:updated', h)
    }
  },
  onboarding: {
    start: () => ipcRenderer.invoke('onboarding:start'),
    onStep: (cb: (step: string) => void) => {
      const h = (_: unknown, s: string) => cb(s)
      ipcRenderer.on('onboarding:step', h)
      return () => ipcRenderer.removeListener('onboarding:step', h)
    },
    onProgress: (cb: (p: { percent: number; statusText: string; speedText?: string }) => void) => {
      const h = (_: unknown, p: { percent: number; statusText: string; speedText?: string }) =>
        cb(p)
      ipcRenderer.on('onboarding:progress', h)
      return () => ipcRenderer.removeListener('onboarding:progress', h)
    },
    onError: (cb: (msg: string) => void) => {
      const h = (_: unknown, m: string) => cb(m)
      ipcRenderer.on('onboarding:error', h)
      return () => ipcRenderer.removeListener('onboarding:error', h)
    }
  },
  update: {
    onInstalled: (cb: (version: string) => void) => {
      const h = (_: unknown, v: string) => cb(v)
      ipcRenderer.on('update:installed', h)
      return () => ipcRenderer.removeListener('update:installed', h)
    }
  },
  lifecycle: {
    onBeforeQuit: (cb: () => void) => {
      const h = () => cb()
      ipcRenderer.on('app:before-quit', h)
      return () => ipcRenderer.removeListener('app:before-quit', h)
    }
  }
})
