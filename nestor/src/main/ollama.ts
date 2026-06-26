import { BrowserWindow } from 'electron'
import { OllamaChatMessage, OllamaStatus, Settings } from '../shared/types'

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

export async function testExternalApi(apiKey: string, baseUrl: string): Promise<{ ok: boolean; message: string }> {
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/models`
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000)
    })
    if (res.ok) return { ok: true, message: 'Verbindung erfolgreich.' }
    if (res.status === 401) return { ok: false, message: 'API-Schlüssel ungültig oder abgelaufen.' }
    if (res.status === 403) return { ok: false, message: 'Zugriff verweigert. Prüfe deinen API-Schlüssel.' }
    return { ok: false, message: `Fehler ${res.status} von der API.` }
  } catch (e) {
    const msg = String(e)
    if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) return { ok: false, message: 'URL nicht erreichbar. Ist die Base URL korrekt?' }
    if (msg.includes('timeout') || msg.includes('TimeoutError')) return { ok: false, message: 'Zeitüberschreitung. Server antwortet nicht.' }
    return { ok: false, message: 'Keine Verbindung möglich.' }
  }
}

export async function streamChat(
  win: BrowserWindow,
  messages: OllamaChatMessage[],
  systemPrompt: string,
  model: string = DEFAULT_MODEL,
  settings?: Pick<Settings, 'aiMode' | 'apiKey' | 'apiBaseUrl'>
): Promise<void> {
  if (settings?.aiMode === 'api') {
    await streamChatApi(win, messages, systemPrompt, model, settings)
  } else {
    await streamChatOllama(win, messages, systemPrompt, model)
  }
}

async function streamChatOllama(
  win: BrowserWindow,
  messages: OllamaChatMessage[],
  systemPrompt: string,
  model: string
): Promise<void> {
  const allMessages: OllamaChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ]

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: allMessages, stream: true })
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

async function streamChatApi(
  win: BrowserWindow,
  messages: OllamaChatMessage[],
  systemPrompt: string,
  model: string,
  settings: Pick<Settings, 'apiKey' | 'apiBaseUrl'>
): Promise<void> {
  const allMessages: OllamaChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ]

  const baseUrl = (settings.apiBaseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey ?? ''}`
      },
      body: JSON.stringify({ model, messages: allMessages, stream: true })
    })

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => 'Unbekannter Fehler')
      win.webContents.send('ollama:error', `API-Fehler ${res.status}: ${errText}`)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    win.webContents.send('ollama:start')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n')

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          win.webContents.send('ollama:done')
          continue
        }

        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string }; finish_reason?: string | null }[]
          }
          const content = json.choices?.[0]?.delta?.content
          if (content) win.webContents.send('ollama:token', content)
          if (json.choices?.[0]?.finish_reason === 'stop') {
            win.webContents.send('ollama:done')
          }
        } catch {
          // skip malformed SSE lines
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
