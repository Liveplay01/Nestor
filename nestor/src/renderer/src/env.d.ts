/// <reference types="vite/client" />

import type { Settings, FileEntry, HistoryItem, OllamaStatus, OllamaChatMessage } from '../../shared/types'

interface NestorAPI {
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
  }
  settings: {
    get: () => Promise<Settings>
    set: (patch: Partial<Settings>) => Promise<void>
    selectFolder: () => Promise<string | null>
  }
  fs: {
    listDir: (path: string) => Promise<FileEntry[]>
    readFile: (path: string) => Promise<string>
    createFolder: (path: string) => Promise<HistoryItem>
    copyFile: (from: string, to: string) => Promise<HistoryItem>
    moveFile: (from: string, to: string) => Promise<HistoryItem>
    renameFile: (path: string, newName: string) => Promise<HistoryItem>
    deleteFile: (path: string) => Promise<HistoryItem>
    undo: (id: string) => Promise<void>
    search: (rootPath: string, query: string) => Promise<FileEntry[]>
    writeFile: (path: string, content: string) => Promise<void>
    createFile: (path: string) => Promise<HistoryItem>
    onChanged: (cb: (rootPath: string) => void) => () => void
  }
  shell: {
    openPath: (path: string) => Promise<string>
    showInFolder: (path: string) => Promise<void>
    openExternal: (url: string) => Promise<void>
  }
  app: {
    getVersion: () => Promise<string>
    getSpecialFolders: () => Promise<{ desktop: string; downloads: string; documents: string }>
  }
  ollama: {
    check: () => Promise<OllamaStatus>
    models: () => Promise<string[]>
    testApi: (apiKey: string, baseUrl: string) => Promise<{ ok: boolean; message: string }>
    chat: (
      messages: OllamaChatMessage[],
      systemPrompt: string,
      model?: string
    ) => Promise<void>
    onStart: (cb: () => void) => () => void
    onToken: (cb: (token: string) => void) => () => void
    onDone: (cb: () => void) => () => void
    onError: (cb: (msg: string) => void) => () => void
  }
  history: {
    get: () => Promise<HistoryItem[]>
    onUpdated: (cb: (items: HistoryItem[]) => void) => () => void
  }
  onboarding: {
    start: () => Promise<void>
    onStep: (cb: (step: string) => void) => () => void
    onProgress: (cb: (p: { percent: number; statusText: string; speedText?: string }) => void) => () => void
    onError: (cb: (msg: string) => void) => () => void
  }
  update: {
    onInstalled: (cb: (version: string) => void) => () => void
  }
  lifecycle: {
    onBeforeQuit: (cb: () => void) => () => void
  }
}

declare global {
  interface Window {
    nestor: NestorAPI
    __nestorSetStreamId?: (id: string) => void
  }
}
