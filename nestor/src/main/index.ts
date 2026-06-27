import { app, BrowserWindow, shell, nativeImage } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { setupAutoUpdater, checkPendingUpdate } from './updater'
import log from './logger'

const isDev = process.env['NODE_ENV'] === 'development' || !!process.env['ELECTRON_RENDERER_URL']

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const updatedVersion = checkPendingUpdate()

  const iconPath = join(__dirname, '../../resources/icon.ico')
  const icon = nativeImage.createFromPath(iconPath)

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#FFFFFF',
    icon,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    if (updatedVersion) {
      // Slight delay so the UI is fully painted before the toast appears
      setTimeout(() => {
        mainWindow!.webContents.send('update:installed', updatedVersion)
      }, 1500)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  log.info(`Nestor ${app.getVersion()} starting`)
  app.setAppUserModelId('com.nestor.app')

  registerIpcHandlers(() => mainWindow)
  createWindow()

  if (!isDev) setupAutoUpdater()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// WM_QUERYENDSESSION — Windows sends this before shutdown/restart/logoff.
// We notify the renderer so it can flush any in-memory state, then quit
// within 1 s so we never block the OS shutdown sequence.
let shuttingDown = false
app.on('before-quit', (event) => {
  if (shuttingDown) return
  event.preventDefault()
  shuttingDown = true
  log.info('App shutting down')

  const win = mainWindow
  if (win && !win.isDestroyed()) {
    win.webContents.send('app:before-quit')
  }

  setTimeout(() => app.quit(), 1000)
})
