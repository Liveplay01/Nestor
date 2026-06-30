/// <reference types="vite/client" />

import type { Settings, FileEntry, HistoryItem, OllamaStatus, OllamaChatMessage, DuplicateGroup, FolderStats, SavedAction, StorageInsight, SearchResult, AutomationRule, FileTagsMap, ConflictInfo, FsStat, ProblemFinding } from '../../shared/types'

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
    listDir: (path: string, limit?: number, offset?: number) => Promise<FileEntry[]>
    readFile: (path: string) => Promise<string>
    createFolder: (path: string) => Promise<HistoryItem>
    copyFile: (from: string, to: string) => Promise<HistoryItem>
    moveFile: (from: string, to: string) => Promise<HistoryItem>
    renameFile: (path: string, newName: string) => Promise<HistoryItem>
    deleteFile: (path: string) => Promise<HistoryItem>
    undo: (id: string) => Promise<void>
    undoAll: (ids: string[]) => Promise<{ succeeded: string[]; failed: string[] }>
    checkConflict: (to: string) => Promise<ConflictInfo>
    stat: (path: string) => Promise<FsStat>
    detectIssues: () => Promise<ProblemFinding[]>
    search: (query: string) => Promise<FileEntry[]>
    previewDocx: (path: string) => Promise<string>
    previewXlsx: (path: string) => Promise<Array<{ name: string; rows: (string | number | boolean | null)[][]; totalRows: number }>>
    writeFile: (path: string, content: string) => Promise<void>
    createFile: (path: string) => Promise<HistoryItem>
    onChanged: (cb: (rootPath: string) => void) => () => void
    findDuplicates: () => Promise<DuplicateGroup[]>
    analyzeFolder: () => Promise<FolderStats | null>
    analyzeStorage: (rootFolder: string, downloadsPath: string) => Promise<StorageInsight | null>
    searchFullText: (query: string) => Promise<SearchResult[]>
    batchRename: (renames: { from: string; newName: string }[]) => Promise<HistoryItem[]>
  }
  tags: {
    getAll: () => Promise<FileTagsMap>
    setFileTags: (filePath: string, tags: string[]) => Promise<void>
    getAllNames: () => Promise<string[]>
  }
  actions: {
    getAll: () => Promise<SavedAction[]>
    save: (action: SavedAction) => Promise<void>
    update: (action: SavedAction) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  shell: {
    openPath: (path: string) => Promise<string>
    showInFolder: (path: string) => Promise<void>
    openExternal: (url: string) => Promise<void>
  }
  app: {
    getVersion: () => Promise<string>
    getSpecialFolders: () => Promise<{ desktop: string; downloads: string; documents: string }>
    getStartup: () => Promise<boolean>
    setStartup: (enabled: boolean) => Promise<void>
    exportData: () => Promise<string>
    clearData: () => Promise<void>
    saveExport: (content: string, defaultName: string, filters: { name: string; extensions: string[] }[]) => Promise<string | false>
    getUninstallInfo: () => Promise<{ nestorFound: boolean; ollamaFound: boolean; isDev: boolean }>
    uninstall: (opts: { uninstallOllama: boolean }) => Promise<void>
    addWorkspace: () => Promise<{ workspaces: string[]; rootFolder: string } | null>
    removeWorkspace: (folderPath: string) => Promise<{ workspaces: string[]; rootFolder: string }>
    switchWorkspace: (folderPath: string) => Promise<string>
    createDemoFolder: () => Promise<string>
  }
  ollama: {
    check: () => Promise<OllamaStatus>
    models: () => Promise<string[]>
    tryStart: () => Promise<boolean>
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
  automations: {
    getAll: () => Promise<AutomationRule[]>
    save: (rule: AutomationRule) => Promise<void>
    update: (rule: AutomationRule) => Promise<void>
    delete: (id: string) => Promise<void>
    runNow: (id: string) => Promise<{ ok: boolean; label: string }>
    onCompleted: (cb: (payload: { id: string; result: string }) => void) => () => void
  }
}

declare global {
  interface Window {
    nestor: NestorAPI
    __nestorSetStreamId?: (id: string) => void
  }
}
