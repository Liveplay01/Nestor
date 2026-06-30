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
  searchFullText,
  assertWithinRoot,
  findDuplicates,
  analyzeFolder,
  analyzeStorage,
  runMoveByAge,
  runSortByType,
  runDeleteEmptyFolders
} from './fs-manager'
import { checkOllama, streamChat, getAvailableModels, testExternalApi } from './ollama'
import { runOnboarding } from './onboarding'
import { Settings, HistoryItem, SavedAction, AutomationRule, FileTagsMap } from '../shared/types'
import log from './logger'

const store = new Store<{ settings: Settings; history: HistoryItem[]; savedActions: SavedAction[]; automations: AutomationRule[]; tags: FileTagsMap }>({
  defaults: {
    settings: {
      rootFolder: '',
      workspaces: [],
      model: 'llama3.2:3b',
      language: 'de',
      accentColor: '#2563EB',
      onboardingComplete: false,
      aiMode: null,
      apiKey: '',
      apiBaseUrl: 'https://api.openai.com/v1',
      theme: 'light',
      notifications: true,
      minimizeToTray: false
    },
    history: [],
    savedActions: [],
    automations: [],
    tags: {}
  }
})

let watcher: chokidar.FSWatcher | null = null

export function getMinimizeToTray(): boolean {
  return store.get('settings').minimizeToTray ?? false
}

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
  ipcMain.handle('fs:list-dir', (_, { path, limit, offset }: { path: string; limit?: number; offset?: number }) => {
    const root = store.get('settings').rootFolder
    assertWithinRoot(root, path)
    return listDir(path, 0, 3, limit, offset)
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

  // ── Export & Berichte ─────────────────────────────────────
  ipcMain.handle('app:save-export', async (_, { content, defaultName, filters }: { content: string; defaultName: string; filters: { name: string; extensions: string[] }[] }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return false
    try {
      const result = await dialog.showSaveDialog(win, { defaultPath: defaultName, filters })
      if (result.canceled || !result.filePath) return false
      fs.writeFileSync(result.filePath, content, 'utf-8')
      return result.filePath as string
    } catch (err) {
      log.error('[app:save-export]', err)
      throw err
    }
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

  // ── Duplicate finder ──────────────────────────────────────
  ipcMain.handle('fs:find-duplicates', async () => {
    const root = store.get('settings').rootFolder
    if (!root) return []
    try {
      return await findDuplicates(root)
    } catch (err) {
      log.error('[fs:find-duplicates]', err)
      throw err
    }
  })

  // ── Folder analysis ───────────────────────────────────────
  ipcMain.handle('fs:analyze-folder', () => {
    const root = store.get('settings').rootFolder
    if (!root) return null
    try {
      return analyzeFolder(root)
    } catch (err) {
      log.error('[fs:analyze-folder]', err)
      throw err
    }
  })

  ipcMain.handle('fs:analyze-storage', (_, { rootFolder, downloadsPath }: { rootFolder: string; downloadsPath: string }) => {
    if (!rootFolder) return null
    try {
      return analyzeStorage(rootFolder, downloadsPath)
    } catch (err) {
      log.error('[fs:analyze-storage]', err)
      throw err
    }
  })

  // ── Saved quick actions ───────────────────────────────────
  ipcMain.handle('actions:get-all', () => store.get('savedActions'))
  ipcMain.handle('actions:save', (_, action: SavedAction) => {
    const actions = store.get('savedActions')
    store.set('savedActions', [...actions, action])
  })
  ipcMain.handle('actions:update', (_, updated: SavedAction) => {
    const actions = store.get('savedActions')
    store.set('savedActions', actions.map(a => a.id === updated.id ? updated : a))
  })
  ipcMain.handle('actions:delete', (_, id: string) => {
    const actions = store.get('savedActions')
    store.set('savedActions', actions.filter(a => a.id !== id))
  })

  // ── Workspace management ──────────────────────────────────
  ipcMain.handle('app:add-workspace', async () => {
    const win = getWin()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    if (result.canceled || !result.filePaths[0]) return null
    const folderPath = result.filePaths[0]
    const current = store.get('settings')
    const workspaces = current.workspaces ?? []
    if (!workspaces.includes(folderPath)) {
      const next = [...workspaces, folderPath].slice(-5) // max 5
      store.set('settings', { ...current, workspaces: next, rootFolder: folderPath })
      startWatcher(folderPath, getWin)
      getWin()?.webContents.send('fs:changed', folderPath)
      return { workspaces: next, rootFolder: folderPath }
    }
    // Already in list — just switch to it
    store.set('settings', { ...current, rootFolder: folderPath })
    startWatcher(folderPath, getWin)
    getWin()?.webContents.send('fs:changed', folderPath)
    return { workspaces, rootFolder: folderPath }
  })

  ipcMain.handle('app:remove-workspace', (_, { folderPath }: { folderPath: string }) => {
    const current = store.get('settings')
    const workspaces = (current.workspaces ?? []).filter(w => w !== folderPath)
    let rootFolder = current.rootFolder
    if (rootFolder === folderPath) {
      rootFolder = workspaces[0] ?? ''
      if (rootFolder) startWatcher(rootFolder, getWin)
      getWin()?.webContents.send('fs:changed', rootFolder)
    }
    store.set('settings', { ...current, workspaces, rootFolder })
    return { workspaces, rootFolder }
  })

  ipcMain.handle('app:switch-workspace', (_, { folderPath }: { folderPath: string }) => {
    const current = store.get('settings')
    store.set('settings', { ...current, rootFolder: folderPath })
    startWatcher(folderPath, getWin)
    getWin()?.webContents.send('fs:changed', folderPath)
    return folderPath
  })

  // ── Full-text search ──────────────────────────────────────
  ipcMain.handle('fs:search-fulltext', async (_, { query }: { query: string }) => {
    const root = store.get('settings').rootFolder
    if (!root || query.length < 2) return []
    return searchFullText(root, query)
  })

  // ── Automations CRUD ──────────────────────────────────────
  ipcMain.handle('automations:get-all', () => store.get('automations'))

  ipcMain.handle('automations:save', (_, rule: AutomationRule) => {
    const list = store.get('automations')
    store.set('automations', [...list, rule])
  })

  ipcMain.handle('automations:update', (_, rule: AutomationRule) => {
    const list = store.get('automations').map(r => r.id === rule.id ? rule : r)
    store.set('automations', list)
  })

  ipcMain.handle('automations:delete', (_, id: string) => {
    const list = store.get('automations').filter(r => r.id !== id)
    store.set('automations', list)
  })

  ipcMain.handle('automations:run-now', async (_, id: string) => {
    const list = store.get('automations')
    const rule = list.find(r => r.id === id)
    if (!rule) return
    const root = store.get('settings').rootFolder
    const source = rule.config.sourceFolder || root
    let result = { count: 0, label: '' }

    try {
      if (rule.action === 'move_by_age') {
        const target = rule.config.targetFolder || path.join(root, 'Archiv')
        const age = rule.config.ageInDays ?? 30
        const { moved } = runMoveByAge(source, target, age)
        result = { count: moved, label: `${moved} Datei${moved !== 1 ? 'en' : ''} verschoben` }
      } else if (rule.action === 'sort_by_type') {
        const { moved } = runSortByType(source)
        result = { count: moved, label: `${moved} Datei${moved !== 1 ? 'en' : ''} sortiert` }
      } else if (rule.action === 'delete_empty_folders') {
        const { deleted } = runDeleteEmptyFolders(source)
        result = { count: deleted, label: `${deleted} leere${deleted !== 1 ? ' Ordner' : 'r Ordner'} gelöscht` }
      }
    } catch (err) {
      log.error('[automations:run-now]', err)
      return { ok: false, label: 'Fehler beim Ausführen' }
    }

    const now = Date.now()
    const updated = list.map(r => r.id === id ? { ...r, lastRun: now, lastResult: result.label } : r)
    store.set('automations', updated)
    getWin()?.webContents.send('fs:changed', store.get('settings').rootFolder)
    getWin()?.webContents.send('automations:completed', { id, result: result.label })
    return { ok: true, label: result.label }
  })

  // ── Automation Scheduler ──────────────────────────────────
  function checkAndRunDueAutomations(): void {
    const rules = store.get('automations').filter(r => r.enabled)
    const root = store.get('settings').rootFolder
    if (!root) return
    const now = Date.now()
    const DAY = 24 * 60 * 60 * 1000

    for (const rule of rules) {
      let due = false
      if (rule.trigger === 'on_start') {
        due = rule.lastRun === null
      } else if (rule.trigger === 'daily') {
        due = rule.lastRun === null || (now - rule.lastRun) >= DAY
      } else if (rule.trigger === 'weekly') {
        due = rule.lastRun === null || (now - rule.lastRun) >= 7 * DAY
      }
      if (!due) continue

      try {
        const source = rule.config.sourceFolder || root
        let resultLabel = ''
        if (rule.action === 'move_by_age') {
          const target = rule.config.targetFolder || path.join(root, 'Archiv')
          const { moved } = runMoveByAge(source, target, rule.config.ageInDays ?? 30)
          resultLabel = `${moved} Datei${moved !== 1 ? 'en' : ''} verschoben`
        } else if (rule.action === 'sort_by_type') {
          const { moved } = runSortByType(source)
          resultLabel = `${moved} Datei${moved !== 1 ? 'en' : ''} sortiert`
        } else if (rule.action === 'delete_empty_folders') {
          const { deleted } = runDeleteEmptyFolders(source)
          resultLabel = `${deleted} leere${deleted !== 1 ? ' Ordner' : 'r Ordner'} gelöscht`
        }
        const list = store.get('automations').map(r => r.id === rule.id ? { ...r, lastRun: now, lastResult: resultLabel } : r)
        store.set('automations', list)
        log.info(`[automation] "${rule.name}": ${resultLabel}`)
      } catch (err) {
        log.error('[automation]', rule.name, err)
      }
    }
  }

  // ── Batch rename ──────────────────────────────────────────
  ipcMain.handle('fs:batch-rename', (_, renames: { from: string; newName: string }[]) => {
    const root = store.get('settings').rootFolder
    const results: HistoryItem[] = []
    for (const r of renames) {
      assertWithinRoot(root, r.from)
      const item = renameFile(r.from, r.newName)
      saveHistory(item)
      results.push(item)
    }
    return results
  })

  // ── Tags ──────────────────────────────────────────────────
  ipcMain.handle('tags:get-all', () => store.get('tags'))

  ipcMain.handle('tags:set-file-tags', (_, { filePath, tags }: { filePath: string; tags: string[] }) => {
    const current = store.get('tags')
    if (tags.length === 0) {
      const { [filePath]: _, ...rest } = current
      store.set('tags', rest)
    } else {
      store.set('tags', { ...current, [filePath]: tags })
    }
  })

  ipcMain.handle('tags:get-all-names', () => {
    const tags = store.get('tags')
    return [...new Set(Object.values(tags).flat())].sort()
  })

  // ── Startup: init watcher if folder already set ───────────
  const settings = store.get('settings')
  if (settings.rootFolder) {
    startWatcher(settings.rootFolder, getWin)
  }
  checkAndRunDueAutomations()
  setInterval(checkAndRunDueAutomations, 60 * 60 * 1000)
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
