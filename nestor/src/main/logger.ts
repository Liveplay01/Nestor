import log from 'electron-log'
import { app } from 'electron'
import { join } from 'path'

// Logs → %LocalAppData%\Nestor\logs\main.log
// app.getPath('logs') resolves lazily after app is ready; falls back to
// LOCALAPPDATA env var so early-boot errors are still captured.
log.transports.file.resolvePathFn = () => {
  try {
    return join(app.getPath('logs'), 'main.log')
  } catch {
    const base = process.env['LOCALAPPDATA'] ?? process.env['APPDATA'] ?? '.'
    return join(base, 'Nestor', 'logs', 'main.log')
  }
}
log.transports.file.maxSize = 10 * 1024 * 1024
log.transports.file.level = 'info'

// Konsolen-Output nur in Dev, damit keine PII in Prod-Terminals landet
log.transports.console.level = process.env['NODE_ENV'] === 'development' ? 'debug' : false

export default log
