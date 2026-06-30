import { contextBridge, ipcRenderer } from 'electron'
import type { Settings, OllamaChatMessage, SavedAction, AutomationRule, FileTagsMap } from '../shared/types'

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
    listDir: (path: string, limit?: number, offset?: number) => ipcRenderer.invoke('fs:list-dir', { path, limit, offset }),
    readFile: (path: string) => ipcRenderer.invoke('fs:read-file', { path }),
    createFolder: (path: string) => ipcRenderer.invoke('fs:create-folder', { path }),
    copyFile: (from: string, to: string) => ipcRenderer.invoke('fs:copy-file', { from, to }),
    moveFile: (from: string, to: string) => ipcRenderer.invoke('fs:move-file', { from, to }),
    renameFile: (path: string, newName: string) =>
      ipcRenderer.invoke('fs:rename-file', { path, newName }),
    deleteFile: (path: string) => ipcRenderer.invoke('fs:delete-file', { path }),
    undo: (id: string) => ipcRenderer.invoke('fs:undo', { id }),
    search: (query: string) => ipcRenderer.invoke('fs:search', { query }),
    previewDocx: (path: string) => ipcRenderer.invoke('fs:preview-docx', { path }),
    previewXlsx: (path: string) => ipcRenderer.invoke('fs:preview-xlsx', { path }),
    writeFile: (path: string, content: string) =>
      ipcRenderer.invoke('fs:write-file', { path, content }),
    createFile: (path: string) => ipcRenderer.invoke('fs:create-file', { path }),
    onChanged: (cb: (rootPath: string) => void) => {
      const handler = (_: unknown, p: string) => cb(p)
      ipcRenderer.on('fs:changed', handler)
      return () => ipcRenderer.removeListener('fs:changed', handler)
    },
    findDuplicates: () => ipcRenderer.invoke('fs:find-duplicates'),
    analyzeFolder: () => ipcRenderer.invoke('fs:analyze-folder'),
    analyzeStorage: (rootFolder: string, downloadsPath: string) => ipcRenderer.invoke('fs:analyze-storage', { rootFolder, downloadsPath }),
    searchFullText: (query: string) => ipcRenderer.invoke('fs:search-fulltext', { query }),
    batchRename: (renames: { from: string; newName: string }[]) =>
      ipcRenderer.invoke('fs:batch-rename', renames)
  },
  tags: {
    getAll: (): Promise<FileTagsMap> => ipcRenderer.invoke('tags:get-all'),
    setFileTags: (filePath: string, tags: string[]): Promise<void> =>
      ipcRenderer.invoke('tags:set-file-tags', { filePath, tags }),
    getAllNames: (): Promise<string[]> => ipcRenderer.invoke('tags:get-all-names')
  },
  actions: {
    getAll: (): Promise<SavedAction[]> => ipcRenderer.invoke('actions:get-all'),
    save: (action: SavedAction): Promise<void> => ipcRenderer.invoke('actions:save', action),
    update: (action: SavedAction): Promise<void> => ipcRenderer.invoke('actions:update', action),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('actions:delete', id)
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
    setStartup: (enabled: boolean): Promise<void> => ipcRenderer.invoke('app:set-startup', enabled),
    exportData: (): Promise<string> => ipcRenderer.invoke('app:export-data'),
    clearData: (): Promise<void> => ipcRenderer.invoke('app:clear-data'),
    saveExport: (content: string, defaultName: string, filters: { name: string; extensions: string[] }[]): Promise<string | false> =>
      ipcRenderer.invoke('app:save-export', { content, defaultName, filters }),
    getUninstallInfo: (): Promise<{ nestorFound: boolean; ollamaFound: boolean; isDev: boolean }> =>
      ipcRenderer.invoke('app:get-uninstall-info'),
    uninstall: (opts: { uninstallOllama: boolean }): Promise<void> =>
      ipcRenderer.invoke('app:uninstall', opts),
    addWorkspace: (): Promise<{ workspaces: string[]; rootFolder: string } | null> =>
      ipcRenderer.invoke('app:add-workspace'),
    removeWorkspace: (folderPath: string): Promise<{ workspaces: string[]; rootFolder: string }> =>
      ipcRenderer.invoke('app:remove-workspace', { folderPath }),
    switchWorkspace: (folderPath: string): Promise<string> =>
      ipcRenderer.invoke('app:switch-workspace', { folderPath })
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
  },
  automations: {
    getAll: (): Promise<AutomationRule[]> => ipcRenderer.invoke('automations:get-all'),
    save: (rule: AutomationRule): Promise<void> => ipcRenderer.invoke('automations:save', rule),
    update: (rule: AutomationRule): Promise<void> => ipcRenderer.invoke('automations:update', rule),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('automations:delete', id),
    runNow: (id: string): Promise<{ ok: boolean; label: string }> => ipcRenderer.invoke('automations:run-now', id),
    onCompleted: (cb: (payload: { id: string; result: string }) => void) => {
      const h = (_: unknown, payload: { id: string; result: string }) => cb(payload)
      ipcRenderer.on('automations:completed', h)
      return () => ipcRenderer.removeListener('automations:completed', h)
    }
  }
})
