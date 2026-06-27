import log from 'electron-log'
import { join } from 'path'

// Logs → %LocalAppData%\Nestor\logs\main.log  (nicht Roaming)
// Limit: 10 MB pro Datei, 3 rotierende Dateien = max 30 MB gesamt
const localAppData = process.env['LOCALAPPDATA'] ?? ''

log.transports.file.resolvePathFn = () =>
  join(localAppData, 'Nestor', 'logs', 'main.log')
log.transports.file.maxSize = 10 * 1024 * 1024
log.transports.file.archiveLog = (oldPath) => oldPath + '.old'
log.transports.file.level = 'info'

// Konsolen-Output nur in Dev, damit keine PII in Prod-Terminals landet
log.transports.console.level = process.env['NODE_ENV'] === 'development' ? 'debug' : false

export default log
