import { app, BrowserWindow, shell, nativeImage, Tray, Menu } from 'electron'
import { join } from 'path'
import { registerIpcHandlers, getMinimizeToTray } from './ipc'
import { setupAutoUpdater, checkPendingUpdate } from './updater'
import log from './logger'

const isDev = process.env['NODE_ENV'] === 'development' || !!process.env['ELECTRON_RENDERER_URL']

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let shuttingDown = false

function createTray(): void {
  const iconPath = join(__dirname, '../../resources/icon.ico')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Nestor')

  const updateMenu = (): void => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Nestor öffnen',
        click: () => {
          mainWindow?.show()
          mainWindow?.focus()
        }
      },
      { type: 'separator' },
      {
        label: 'Beenden',
        click: () => {
          shuttingDown = true
          app.quit()
        }
      }
    ])
    tray?.setContextMenu(menu)
  }

  updateMenu()

  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

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
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    if (updatedVersion) {
      setTimeout(() => {
        mainWindow!.webContents.send('update:installed', updatedVersion)
      }, 1500)
    }
  })

  // Intercept close: hide to tray if enabled, otherwise allow normal quit
  mainWindow.on('close', (event) => {
    if (!shuttingDown && getMinimizeToTray()) {
      event.preventDefault()
      mainWindow?.hide()
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
  createTray()

  if (!isDev) setupAutoUpdater()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit here if tray is active — the window is just hidden
    if (!tray || shuttingDown) {
      app.quit()
    }
  }
})

process.on('uncaughtException', (err) => {
  log.error('[uncaughtException]', err)
})
process.on('unhandledRejection', (reason) => {
  log.error('[unhandledRejection]', reason)
})

// WM_QUERYENDSESSION — Windows sends this before shutdown/restart/logoff.
// Notify the renderer to flush in-memory state, then quit within 1s.
app.on('before-quit', (event) => {
  if (shuttingDown) return
  event.preventDefault()
  shuttingDown = true
  log.info('App shutting down')

  const win = mainWindow
  if (win && !win.isDestroyed()) {
    win.webContents.send('app:before-quit')
  }

  setTimeout(() => app.quit(), 500)
})
