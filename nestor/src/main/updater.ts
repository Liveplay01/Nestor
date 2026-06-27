import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from './logger'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Store = require('electron-store') as typeof import('electron-store').default

const store = new Store()

// Called once on startup — returns the version string if we just updated,
// null otherwise. The flag is written right before quitAndInstall so we
// can compare it to the running version after the restart.
export function checkPendingUpdate(): string | null {
  const pending = store.get('pendingUpdateVersion') as string | undefined
  if (pending && pending === app.getVersion()) {
    store.delete('pendingUpdateVersion')
    return pending
  }
  return null
}

export function setupAutoUpdater(): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    log.info(`Update available: ${info.version}`)
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info(`Update downloaded: ${info.version}`)
    // Store the target version before the installer replaces the app.
    // On the next launch checkPendingUpdate() matches it against app.getVersion()
    // to trigger the "just updated" toast.
    store.set('pendingUpdateVersion', info.version)
  })

  autoUpdater.on('error', (err: Error) => {
    log.error('[updater]', err.message)
  })

  // Delay the first check so the main window is visible before any network
  // activity starts and potential error dialogs interfere.
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  }, 8000)
}
