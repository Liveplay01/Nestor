import { ipcMain, BrowserWindow, dialog } from 'electron'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Store = require('electron-store') as typeof import('electron-store').default
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chokidar = require('chokidar') as typeof import('chokidar')
import {
  listDir,
  readFile,
  createFolder,
  moveFile,
  renameFile,
  deleteFile,
  undoAction,
  searchFiles
} from './fs-manager'
import { checkOllama, streamChat, getAvailableModels } from './ollama'
import { runOnboarding } from './onboarding'
import { Settings, HistoryItem } from '../shared/types'

const store = new Store<{ settings: Settings; history: HistoryItem[] }>({
  defaults: {
    settings: {
      rootFolder: '',
      model: 'llama3.2:3b',
      language: 'de',
      accentColor: '#2563EB',
      onboardingComplete: false
    },
    history: []
  }
})

let watcher: chokidar.FSWatcher | null = null

export function registerIpcHandlers(getWin: () => BrowserWindow | null): void {
  // ── Window controls ──────────────────────────────────────
  ipcMain.handle('window:minimize', () => getWin()?.minimize())
  ipcMain.handle('window:maximize', () => {
    const w = getWin()
    if (!w) return
    if (w.isMaximized()) w.unmaximize()
    else w.maximize()
  })
  ipcMain.handle('window:close', () => getWin()?.close())
  ipcMain.handle('window:is-maximized', () => getWin()?.isMaximized() ?? false)

  // ── Settings ─────────────────────────────────────────────
  ipcMain.handle('app:get-settings', () => store.get('settings'))
  ipcMain.handle('app:set-settings', (_, patch: Partial<Settings>) => {
    const current = store.get('settings')
    const next = { ...current, ...patch }
    store.set('settings', next)

    // Restart watcher if root folder changed
    if (patch.rootFolder && patch.rootFolder !== current.rootFolder) {
      startWatcher(patch.rootFolder, getWin)
    }
  })

  ipcMain.handle('app:select-folder', async () => {
    const win = getWin()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // ── File system ───────────────────────────────────────────
  ipcMain.handle('fs:list-dir', (_, { path }: { path: string }) => {
    return listDir(path)
  })

  ipcMain.handle('fs:read-file', (_, { path }: { path: string }) => {
    return readFile(path)
  })

  ipcMain.handle('fs:create-folder', (_, { path }: { path: string }) => {
    const item = createFolder(path)
    saveHistory(item)
    return item
  })

  ipcMain.handle('fs:move-file', (_, { from, to }: { from: string; to: string }) => {
    const item = moveFile(from, to)
    saveHistory(item)
    return item
  })

  ipcMain.handle(
    'fs:rename-file',
    (_, { path, newName }: { path: string; newName: string }) => {
      const item = renameFile(path, newName)
      saveHistory(item)
      return item
    }
  )

  ipcMain.handle('fs:delete-file', (_, { path }: { path: string }) => {
    const item = deleteFile(path)
    saveHistory(item)
    return item
  })

  ipcMain.handle('fs:undo', (_, { id }: { id: string }) => {
    const history = store.get('history')
    const item = history.find((h) => h.id === id)
    if (!item || item.undone) return
    undoAction(item)
    const updated = history.map((h) => (h.id === id ? { ...h, undone: true } : h))
    store.set('history', updated)
    getWin()?.webContents.send('history:updated', updated)
  })

  ipcMain.handle('fs:search', (_, { rootPath, query }: { rootPath: string; query: string }) => {
    return searchFiles(rootPath, query)
  })

  ipcMain.handle('history:get', () => store.get('history'))

  // ── Ollama ────────────────────────────────────────────────
  ipcMain.handle('ollama:check', () => checkOllama())
  ipcMain.handle('ollama:models', () => getAvailableModels())

  ipcMain.handle(
    'ollama:chat',
    async (
      _,
      {
        messages,
        systemPrompt,
        model
      }: {
        messages: { role: string; content: string }[]
        systemPrompt: string
        model?: string
      }
    ) => {
      const win = getWin()
      if (!win) return
      await streamChat(
        win,
        messages as { role: 'user' | 'assistant' | 'system'; content: string }[],
        systemPrompt,
        model
      )
    }
  )

  ipcMain.handle('onboarding:start', async () => {
    const win = getWin()
    if (!win) return
    await runOnboarding(win)
  })

  // ── Startup: init watcher if folder already set ───────────
  const settings = store.get('settings')
  if (settings.rootFolder) {
    startWatcher(settings.rootFolder, getWin)
  }
}

function startWatcher(folderPath: string, getWin: () => BrowserWindow | null): void {
  if (watcher) watcher.close()
  watcher = chokidar.watch(folderPath, {
    depth: 3,
    ignoreInitial: true,
    ignored: /(^|[/\\])\../
  })
  const notify = (): void => {
    getWin()?.webContents.send('fs:changed', folderPath)
  }
  watcher.on('add', notify).on('unlink', notify).on('addDir', notify).on('unlinkDir', notify)
}

function saveHistory(item: HistoryItem): void {
  const history = store.get('history')
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const trimmed = history.filter((h) => h.timestamp > cutoff)
  store.set('history', [item, ...trimmed])
}
