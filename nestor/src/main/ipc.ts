import { ipcMain, BrowserWindow, dialog, shell, app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'
import { spawn, execSync } from 'child_process'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Store = require('electron-store') as typeof import('electron-store').default
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chokidar = require('chokidar') as typeof import('chokidar')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mammoth = require('mammoth') as { convertToHtml: (i: { buffer: Buffer }) => Promise<{ value: string }> }
type XlsxWorkbook = { SheetNames: string[]; Sheets: Record<string, unknown> }
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX: {
  readFile: (p: string) => XlsxWorkbook
  utils: { sheet_to_json: <T>(sheet: unknown, opts?: { header?: 1; defval?: unknown }) => T[] }
} = require('xlsx')
import {
  listDir,
  readFile,
  createFolder,
  copyFile,
  moveFile,
  renameFile,
  deleteFile,
  undoAction,
  searchFiles,
  assertWithinRoot
} from './fs-manager'
import { checkOllama, streamChat, getAvailableModels, testExternalApi } from './ollama'
import { runOnboarding } from './onboarding'
import { Settings, HistoryItem } from '../shared/types'
import log from './logger'

const store = new Store<{ settings: Settings; history: HistoryItem[] }>({
  defaults: {
    settings: {
      rootFolder: '',
      model: 'llama3.2:3b',
      language: 'de',
      accentColor: '#2563EB',
      onboardingComplete: false,
      aiMode: null,
      apiKey: '',
      apiBaseUrl: 'https://api.openai.com/v1',
      theme: 'light',
      notifications: true
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
  // API keys are stored encrypted via safeStorage (DPAPI on Windows).
  // The config.json never contains the plaintext key.
  ipcMain.handle('app:get-settings', () => {
    const settings = store.get('settings')
    const encryptedKey = store.get('apiKeyEncrypted') as string | undefined
    let apiKey = ''
    if (encryptedKey && safeStorage.isEncryptionAvailable()) {
      try {
        apiKey = safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'))
      } catch {
        // Decryption failed (e.g. different user/machine) — return empty
      }
    }
    return { ...settings, apiKey }
  })
  ipcMain.handle('app:set-settings', (_, patch: Partial<Settings>) => {
    const current = store.get('settings')
    if (patch.apiKey !== undefined) {
      if (patch.apiKey && safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(patch.apiKey)
        store.set('apiKeyEncrypted', encrypted.toString('base64'))
      } else {
        store.delete('apiKeyEncrypted')
      }
      delete patch.apiKey
    }
    const next = { ...current, ...patch }
    store.set('settings', next)
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
    const root = store.get('settings').rootFolder
    assertWithinRoot(root, path)
    return listDir(path)
  })

  ipcMain.handle('fs:read-file', (_, { path }: { path: string }) => {
    const root = store.get('settings').rootFolder
    assertWithinRoot(root, path)
    return readFile(path)
  })

  ipcMain.handle('fs:create-folder', (_, { path: p }: { path: string }) => {
    const root = store.get('settings').rootFolder
    assertWithinRoot(root, p)
    const item = createFolder(p)
    saveHistory(item)
    return item
  })

  ipcMain.handle('fs:copy-file', (_, { from, to }: { from: string; to: string }) => {
    const root = store.get('settings').rootFolder
    assertWithinRoot(root, from)
    assertWithinRoot(root, to)
    const item = copyFile(from, to)
    saveHistory(item)
    return item
  })

  ipcMain.handle('fs:move-file', (_, { from, to }: { from: string; to: string }) => {
    const root = store.get('settings').rootFolder
    assertWithinRoot(root, from)
    assertWithinRoot(root, to)
    const item = moveFile(from, to)
    saveHistory(item)
    return item
  })

  ipcMain.handle(
    'fs:rename-file',
    (_, { path: p, newName }: { path: string; newName: string }) => {
      const root = store.get('settings').rootFolder
      assertWithinRoot(root, p)
      const item = renameFile(p, newName)
      saveHistory(item)
      return item
    }
  )

  ipcMain.handle('fs:delete-file', async (_, { path: p }: { path: string }) => {
    const root = store.get('settings').rootFolder
    assertWithinRoot(root, p)
    const item = await deleteFile(p)
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

  ipcMain.handle('fs:search', (_, { query }: { query: string }) => {
    const root = store.get('settings').rootFolder
    if (!root) return []
    return searchFiles(root, query)
  })

  ipcMain.handle('history:get', () => store.get('history'))

  // ── Ollama ────────────────────────────────────────────────
  ipcMain.handle('ollama:check', () => checkOllama())
  ipcMain.handle('ollama:models', () => getAvailableModels())
  ipcMain.handle('ollama:test-api', (_, { apiKey, baseUrl }: { apiKey: string; baseUrl: string }) =>
    testExternalApi(apiKey, baseUrl)
  )

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
      const settings = store.get('settings')
      await streamChat(
        win,
        messages as { role: 'user' | 'assistant' | 'system'; content: string }[],
        systemPrompt,
        model,
        settings
      )
    }
  )

  ipcMain.handle('onboarding:start', async () => {
    const win = getWin()
    if (!win) return
    await runOnboarding(win)
  })

  // ── Shell helpers ─────────────────────────────────────────
  ipcMain.handle('shell:open-path', (_, { path }: { path: string }) => {
    return shell.openPath(path)
  })
  ipcMain.handle('shell:show-in-folder', (_, { path }: { path: string }) => {
    shell.showItemInFolder(path)
  })
  ipcMain.handle('shell:open-external', (_, { url }: { url: string }) => {
    const ALLOWED_PROTOCOLS = ['https:', 'http:', 'mailto:']
    try {
      const parsed = new URL(url)
      if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
        log.warn('[shell:open-external] Blocked protocol:', url)
        return
      }
    } catch {
      log.warn('[shell:open-external] Invalid URL blocked:', url)
      return
    }
    return shell.openExternal(url)
  })

  // ── Extended fs ───────────────────────────────────────────
  ipcMain.handle('fs:write-file', (_, { path: filePath, content }: { path: string; content: string }) => {
    const root = store.get('settings').rootFolder
    assertWithinRoot(root, filePath)
    try {
      fs.writeFileSync(filePath, content, 'utf-8')
    } catch (err) {
      log.error('[fs:write-file]', err)
      throw err
    }
  })
  ipcMain.handle('fs:create-file', (_, { path: filePath }: { path: string }) => {
    const root = store.get('settings').rootFolder
    assertWithinRoot(root, filePath)
    try {
      fs.writeFileSync(filePath, '', 'utf-8')
    } catch (err) {
      log.error('[fs:create-file]', err)
      throw err
    }
    const name = path.basename(filePath)
    const item: HistoryItem = {
      id: Math.random().toString(36).slice(2),
      type: 'create_file',
      verb: 'Datei erstellt',
      target: name,
      time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      undone: false,
      path: filePath
    }
    saveHistory(item)
    return item
  })

  // ── Document preview ─────────────────────────────────────
  ipcMain.handle('fs:preview-docx', async (_, { path: filePath }: { path: string }) => {
    const root = store.get('settings').rootFolder
    assertWithinRoot(root, filePath)
    try {
      const buffer = fs.readFileSync(filePath)
      const result = await mammoth.convertToHtml({ buffer })
      return result.value
    } catch (err) {
      log.error('[fs:preview-docx]', err)
      throw err
    }
  })

  ipcMain.handle('fs:preview-xlsx', (_, { path: filePath }: { path: string }) => {
    const root = store.get('settings').rootFolder
    assertWithinRoot(root, filePath)
    try {
      const workbook = XLSX.readFile(filePath)
      return workbook.SheetNames.map(name => {
        type Row = (string | number | boolean | null)[]
        const allRows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[name], { header: 1, defval: null })
        return { name, rows: allRows.slice(0, 200), totalRows: allRows.length }
      })
    } catch (err) {
      log.error('[fs:preview-xlsx]', err)
      throw err
    }
  })

  // ── App info ──────────────────────────────────────────────
  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('app:get-special-folders', () => ({
    desktop: app.getPath('desktop'),
    downloads: app.getPath('downloads'),
    documents: app.getPath('documents')
  }))

  // ── DSGVO: Daten-Export & Löschung ───────────────────────
  ipcMain.handle('app:export-data', () => {
    const data = { settings: store.get('settings'), history: store.get('history') }
    return JSON.stringify(data, null, 2)
  })
  ipcMain.handle('app:clear-data', () => {
    store.clear()
    log.info('User data cleared via app:clear-data')
  })

  // ── Deinstallation ────────────────────────────────────────
  ipcMain.handle('app:get-uninstall-info', () => {
    const exeDir = path.dirname(app.getPath('exe'))
    const nestorUninstaller = path.join(exeDir, 'Uninstall Nestor.exe')
    const nestorFound = fs.existsSync(nestorUninstaller)
    const ollamaUninstaller = findOllamaUninstaller()
    return { nestorFound, ollamaFound: !!ollamaUninstaller, isDev: !nestorFound }
  })

  ipcMain.handle('app:uninstall', async (_, { uninstallOllama }: { uninstallOllama: boolean }) => {
    if (uninstallOllama) {
      const ollamaPath = findOllamaUninstaller()
      if (ollamaPath) {
        spawn(ollamaPath, ['/SILENT'], { detached: true, stdio: 'ignore', shell: false }).unref()
        await new Promise((r) => setTimeout(r, 800))
      }
    }
    const nestorUninstaller = path.join(path.dirname(app.getPath('exe')), 'Uninstall Nestor.exe')
    if (fs.existsSync(nestorUninstaller)) {
      spawn(nestorUninstaller, [], { detached: true, stdio: 'ignore', shell: false }).unref()
    }
    app.quit()
  })

  // ── Autostart ─────────────────────────────────────────────
  // Reads/writes HKCU\Software\Microsoft\Windows\CurrentVersion\Run.
  // The entry shows up in Task Manager → Startup and Windows Settings → Apps → Startup.
  ipcMain.handle('app:get-startup', () => {
    const { openAtLogin } = app.getLoginItemSettings({ name: 'Nestor' })
    return openAtLogin
  })
  ipcMain.handle('app:set-startup', (_, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled, name: 'Nestor' })
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
  watcher
    .on('add', notify)
    .on('unlink', notify)
    .on('addDir', notify)
    .on('unlinkDir', notify)
    .on('error', (err) => log.error('[chokidar]', err))
}

function findOllamaUninstaller(): string | null {
  const candidates = [
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Ollama',
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Ollama',
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{Ollama}',
  ]
  for (const key of candidates) {
    try {
      const out = execSync(`reg query "${key}" /v UninstallString`, {
        encoding: 'utf-8',
        timeout: 2000,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      })
      const match = out.match(/UninstallString\s+REG_SZ\s+(.+)/)
      if (match) {
        const raw = match[1].trim()
        const exePath = raw.startsWith('"') ? raw.slice(1, raw.indexOf('"', 1)) : raw.split(/\s/)[0]
        if (fs.existsSync(exePath)) return exePath
      }
    } catch { /* key not found — try next */ }
  }
  // Filesystem fallback for common Ollama install locations
  const localAppData = process.env['LOCALAPPDATA'] ?? ''
  for (const name of ['unins000.exe', 'Uninstall Ollama.exe']) {
    const p = path.join(localAppData, 'Programs', 'Ollama', name)
    if (fs.existsSync(p)) return p
  }
  return null
}

function saveHistory(item: HistoryItem): void {
  const history = store.get('history')
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const trimmed = history.filter((h) => h.timestamp > cutoff)
  store.set('history', [item, ...trimmed])
}
