import { BrowserWindow } from 'electron'
import { OllamaChatMessage, OllamaStatus } from '../shared/types'

const OLLAMA_BASE = 'http://localhost:11434'
const DEFAULT_MODEL = 'llama3.2:3b'

export async function checkOllama(): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return { installed: true, running: false, hasModel: false }
    const data = await res.json() as { models?: { name: string }[] }
    const models = data.models ?? []
    const hasModel = models.some(
      (m) => m.name === DEFAULT_MODEL || m.name.startsWith('llama3.2')
    )
    return { installed: true, running: true, hasModel }
  } catch {
    return { installed: false, running: false, hasModel: false }
  }
}

export async function streamChat(
  win: BrowserWindow,
  messages: OllamaChatMessage[],
  systemPrompt: string,
  model: string = DEFAULT_MODEL
): Promise<void> {
  const allMessages: OllamaChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ]

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: allMessages,
        stream: true
      })
    })

    if (!res.ok || !res.body) {
      win.webContents.send('ollama:error', 'Verbindung zu Ollama fehlgeschlagen.')
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    win.webContents.send('ollama:start')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const json = JSON.parse(line) as {
            message?: { content?: string }
            done?: boolean
          }
          if (json.message?.content) {
            win.webContents.send('ollama:token', json.message.content)
          }
          if (json.done) {
            win.webContents.send('ollama:done')
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unbekannter Fehler'
    win.webContents.send('ollama:error', msg)
  }
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`)
    const data = await res.json() as { models?: { name: string }[] }
    return (data.models ?? []).map((m) => m.name)
  } catch {
    return []
  }
}
