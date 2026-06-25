import { BrowserWindow } from 'electron'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { checkOllama } from './ollama'

const execAsync = promisify(exec)
const OLLAMA_WIN_URL = 'https://ollama.com/download/OllamaSetup.exe'
const MODEL = 'llama3.2:3b'

function sendProgress(
  win: BrowserWindow,
  percent: number,
  statusText: string,
  speedText?: string
): void {
  win.webContents.send('onboarding:progress', { percent, statusText, speedText })
}

async function downloadFile(
  url: string,
  destPath: string,
  win: BrowserWindow,
  label: string
): Promise<void> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Download fehlgeschlagen: ${res.status}`)

  const total = Number(res.headers.get('content-length') ?? 0)
  let received = 0
  let lastTime = Date.now()
  let lastReceived = 0

  const writer = fs.createWriteStream(destPath)
  const reader = res.body.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    writer.write(Buffer.from(value))
    received += value.byteLength

    const now = Date.now()
    if (now - lastTime > 500) {
      const speed = (received - lastReceived) / ((now - lastTime) / 1000)
      const remaining = speed > 0 ? (total - received) / speed : 0
      const percent = total > 0 ? Math.round((received / total) * 100) : 0
      const speedText = `${formatBytes(speed)}/s · ${formatSeconds(remaining)} verbleibend`
      sendProgress(
        win,
        percent,
        `${label}… ${formatBytes(received)} / ${formatBytes(total)}`,
        speedText
      )
      lastTime = now
      lastReceived = received
    }
  }

  await new Promise<void>((resolve, reject) => {
    writer.end()
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

async function waitForOllama(timeoutMs = 60000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(2000)
      })
      if (res.ok) return true
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

export async function runOnboarding(win: BrowserWindow): Promise<void> {
  const status = await checkOllama()

  // Step 1: Install Ollama if not running
  if (!status.running) {
    const tmpDir = os.tmpdir()
    const installerPath = path.join(tmpDir, 'OllamaSetup.exe')

    sendProgress(win, 0, 'KI-Engine wird vorbereitet…')

    if (!fs.existsSync(installerPath)) {
      sendProgress(win, 2, 'Lade KI-Engine herunter…')
      await downloadFile(OLLAMA_WIN_URL, installerPath, win, 'KI-Engine wird heruntergeladen')
    }

    sendProgress(win, 100, 'KI-Engine wird installiert…')
    win.webContents.send('onboarding:step', 'install-ollama')

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(installerPath, ['/VERYSILENT', '/SUPPRESSMSGBOXES'], {
        detached: true,
        stdio: 'ignore'
      })
      proc.on('close', (code) => {
        if (code === 0 || code === null) resolve()
        else reject(new Error(`Installer beendet mit Code ${code}`))
      })
      proc.on('error', reject)
    })

    sendProgress(win, 100, 'Warte auf KI-Engine…')
    const ready = await waitForOllama()
    if (!ready) {
      win.webContents.send('onboarding:error', 'Ollama konnte nicht gestartet werden.')
      return
    }
  }

  // Step 2: Pull model if not present
  if (!status.hasModel) {
    win.webContents.send('onboarding:step', 'pull-model')
    sendProgress(win, 0, `Lade Nestor AI herunter…`)

    const res = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: MODEL, stream: true })
    })

    if (!res.ok || !res.body) {
      win.webContents.send('onboarding:error', 'Modell konnte nicht heruntergeladen werden.')
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let lastTime = Date.now()
    let lastCompleted = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const json = JSON.parse(line) as {
            status?: string
            total?: number
            completed?: number
          }

          if (json.total && json.completed !== undefined) {
            const now = Date.now()
            const percent = Math.round((json.completed / json.total) * 100)
            const speed = (json.completed - lastCompleted) / ((now - lastTime) / 1000)
            const remaining = speed > 0 ? (json.total - json.completed) / speed : 0
            const speedText =
              speed > 0
                ? `${formatBytes(speed)}/s · ~${formatSeconds(remaining)} verbleibend`
                : undefined
            sendProgress(
              win,
              percent,
              `Nestor AI wird geladen… ${formatBytes(json.completed)} / ${formatBytes(json.total)}`,
              speedText
            )
            lastTime = now
            lastCompleted = json.completed
          } else if (json.status === 'success') {
            sendProgress(win, 100, 'KI-Modell bereit!')
          }
        } catch {
          // skip
        }
      }
    }
  }

  // Step 3: Choose folder — handled by renderer
  win.webContents.send('onboarding:step', 'choose-folder')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatSeconds(secs: number): string {
  if (secs < 60) return `${Math.ceil(secs)} Sek`
  const m = Math.floor(secs / 60)
  return `${m} Min`
}
