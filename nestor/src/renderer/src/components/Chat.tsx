import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { getFileColor } from '../lib/fileColors'
import { buildSystemPrompt } from '../lib/systemPrompt'
import { randomId, formatTime } from '../lib/utils'
import type { Message, HistoryItem, FileEntry } from '@shared/types'
import NestorLogo from './NestorLogo'
import NestorAnimation from './NestorAnimation'

const ACCENT = '#2563EB'

type AiStatus = 'green' | 'yellow' | 'red'
type ContextFile = { name: string; path: string; color: string }

const STATUS_COLORS: Record<AiStatus, string> = { green: '#16A34A', yellow: '#CA8A04', red: '#DC2626' }
const STATUS_GLOW: Record<AiStatus, string> = { green: '#16A34A24', yellow: '#CA8A0424', red: '#DC262624' }
const STATUS_LABELS: Record<AiStatus, string> = { green: 'Läuft lokal', yellow: 'Online API', red: 'Nicht verbunden' }
const STATUS_TOOLTIPS: Record<AiStatus, string> = {
  green: 'Nestor läuft lokal auf deinem PC – deine Dateien verlassen dieses Gerät nicht.',
  yellow: 'Nestor verwendet eine externe KI (API) – Texte werden zur Verarbeitung an den Anbieter gesendet.',
  red: 'Nestor ist nicht verbunden. Überprüfe deine KI-Einstellungen (⚙).'
}

function friendlyError(err: string): string {
  if (err.includes('ECONNREFUSED') || err.includes('11434'))
    return '⚠️ Nestor ist nicht erreichbar. Öffne die Taskleiste und starte Ollama neu – oder überprüfe deine Einstellungen (⚙).'
  if (err.includes('401') || err.toLowerCase().includes('unauthorized') || err.toLowerCase().includes('api key'))
    return '⚠️ Dein API-Schlüssel ist ungültig oder abgelaufen. Bitte überprüfe ihn in den Einstellungen (⚙).'
  if (err.includes('429') || err.toLowerCase().includes('rate limit'))
    return '⚠️ Zu viele Anfragen in kurzer Zeit. Bitte warte einen Moment und versuche es erneut.'
  if (err.toLowerCase().includes('timeout') || err.includes('ETIMEDOUT'))
    return '⚠️ Nestor hat nicht rechtzeitig geantwortet. Ist deine Internetverbindung aktiv?'
  if (err.includes('ENETUNREACH') || err.includes('ENOTFOUND'))
    return '⚠️ Keine Verbindung zum Internet. Bitte überprüfe deine Netzwerkverbindung.'
  if (err.includes('403') || err.toLowerCase().includes('forbidden'))
    return '⚠️ Zugriff verweigert. Bitte überprüfe deine API-Einstellungen (⚙).'
  return '⚠️ Etwas ist schiefgelaufen. Bitte versuche es erneut oder starte Nestor neu.'
}

const WELCOME_KEY = 'nestor_welcomed_v1'
const WELCOME_MESSAGE = `Hallo! Ich bin Nestor, dein persönlicher Assistent für die Dateiverwaltung. 👋

Ich kann dir helfen:
• Ordner zu sortieren und aufzuräumen
• Dateien zu finden und umzubenennen
• Deinen Desktop oder Downloads zu organisieren

Schreib mir einfach, was du brauchst – zum Beispiel: „Mein Desktop ist ein Chaos, kannst du helfen?"

Du kannst auch Dateien aus dem Dateibaum links in dieses Fenster ziehen, um sie mit mir zu besprechen.`

// ─── Workflow Cards (Empty State) ──────────────────────────────────────────

const WORKFLOW_CARDS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5V17a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 17V7.5z" />
        <path d="M9 13l2 2 4-4" />
      </svg>
    ),
    title: 'Desktop aufräumen',
    desc: 'Chaos sortieren und Struktur schaffen',
    prompt: 'Analysiere meinen Wurzelordner und schlage eine sinnvolle Ordnerstruktur vor'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        <path d="M11 8v6M8 11h6" />
      </svg>
    ),
    title: 'Dokumente finden',
    desc: 'Steuern, Verträge, Rechnungen',
    prompt: 'Finde alle Steuerdokumente und Rechnungen aus 2024 in meinem Ordner'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
    title: 'Fotos sortieren',
    desc: 'Nach Datum oder Ereignis ordnen',
    prompt: 'Zeige mir alle Bilder in meinem Ordner und schlage vor, wie ich sie nach Datum sortieren kann'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    title: 'Downloads organisieren',
    desc: 'Chaotischen Download-Ordner aufräumen',
    prompt: 'Analysiere meinen Ordner und helfe mir, Downloads sinnvoll zu kategorisieren und zu sortieren'
  }
]

// ─── Flat file tree helper ─────────────────────────────────────────────────

function flattenTree(tree: FileEntry[], results: { name: string; path: string; color: string }[] = []) {
  for (const entry of tree) {
    if (!entry.isFolder) {
      results.push({ name: entry.name, path: entry.path, color: getFileColor(entry.name) })
    }
    if (entry.children) flattenTree(entry.children, results)
  }
  return results
}

// ─── Parse AI actions ─────────────────────────────────────────────────────

function parseActions(text: string): { clean: string; actions: Record<string, string>[] } {
  const actions: Record<string, string>[] = []
  const clean = text.replace(/<action>([\s\S]*?)<\/action>/g, (_, json: string) => {
    try { actions.push(JSON.parse(json.trim())) } catch { /* skip */ }
    return ''
  }).trim()
  return { clean, actions }
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FileChipIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M6.5 3.5h7l4 4v12.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" />
      <path d="M13.5 3.5V8h4" />
    </svg>
  )
}

function MessageBubble({ msg, onAnchor }: { msg: Message; onAnchor: (m: Message) => void }): React.JSX.Element {
  if (msg.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="flex justify-end"
      >
        <div
          className="text-[14px] leading-relaxed text-text-primary"
          style={{ maxWidth: '80%', background: 'var(--color-surface)', padding: '10px 15px', borderRadius: '16px 16px 5px 16px', border: '1px solid var(--color-border-strong)' }}
        >
          {msg.text}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex gap-3 group"
    >
      <div className="flex-none" style={{ width: 27, height: 27 }}>
        <NestorLogo size={27} />
      </div>
      <div className="flex-1 min-w-0 pt-px">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[13px] font-semibold text-text-primary">Nestor</span>
          {msg.time && <span className="text-[11.5px] text-text-hint">{msg.time}</span>}
          <button
            onClick={() => onAnchor(msg)}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-text-hint hover:text-accent btn-press"
            title="Als Ankerpunkt speichern"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 3.5h12a.5.5 0 0 1 .5.5v16l-6.5-4.3L5.5 20V4a.5.5 0 0 1 .5-.5z" />
            </svg>
          </button>
        </div>
        <div className="text-[14px] leading-[1.65] text-text-secondary whitespace-pre-wrap">
          {msg.text}
          {msg.isStreaming && <span className="inline-block w-0.5 h-4 bg-accent ml-px animate-pulse" />}
        </div>
        {msg.chips && msg.chips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {msg.chips.map((c, i) => (
              <button
                key={i}
                className="chip-interactive inline-flex items-center gap-[7px] h-[31px] px-3 pl-2.5 border border-border-strong rounded-md text-[12.5px] font-medium text-text-secondary"
                style={{ background: 'var(--color-bg)' }}
              >
                <FileChipIcon color={c.color} />
                {c.name}
              </button>
            ))}
          </div>
        )}
        {msg.text2 && <div className="text-[14px] leading-[1.65] text-text-secondary mt-3">{msg.text2}</div>}
      </div>
    </motion.div>
  )
}

// ─── @ Menu ────────────────────────────────────────────────────────────────

function AtMenu({
  query,
  files,
  onSelect,
  onClose
}: {
  query: string
  files: ContextFile[]
  onSelect: (f: ContextFile) => void
  onClose: () => void
}): React.JSX.Element {
  const filtered = files
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIdx]) onSelect(filtered[activeIdx]) }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, activeIdx, onSelect, onClose])

  if (filtered.length === 0) return <></>

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.14 }}
      className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border-strong shadow-window overflow-hidden z-50"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="px-3 py-2 border-b border-border">
        <span className="text-[11.5px] font-semibold text-text-hint uppercase tracking-wider">Datei verlinken</span>
      </div>
      <div className="py-1 max-h-[220px] overflow-y-auto">
        {filtered.map((f, i) => (
          <button
            key={f.path}
            onClick={() => onSelect(f)}
            className="w-full flex items-center gap-2.5 px-3.5 h-9 text-left transition-colors duration-100"
            style={{ background: i === activeIdx ? 'var(--color-surface)' : 'transparent' }}
          >
            <FileChipIcon color={f.color} />
            <span className="flex-1 min-w-0 truncate text-[13px] text-text-muted">{f.name}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Main Chat ─────────────────────────────────────────────────────────────

export default function Chat(): React.JSX.Element {
  const {
    messages, addMessage, appendToken, finalizeMessage, clearMessages,
    isTyping, setTyping, chatTitle, setChatTitle, chatStartTime, setChatStartTime,
    setFilesInContext, settings, addHistoryItem, addAnchor, addAccessedFile,
    fileTree, showFileTree, setShowFileTree, showActivityLog, setShowActivityLog
  } = useStore()

  const [input, setInput] = useState('')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState<AiStatus>('red')
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [atQuery, setAtQuery] = useState<string | null>(null)
  const [atStartIdx, setAtStartIdx] = useState(-1)

  const msgRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const allFiles = flattenTree(fileTree)

  // On mount: restore saved messages, then show welcome if first launch
  useEffect(() => {
    const CHAT_KEY = 'nestor_chat_v1'
    let savedMsgs: Message[] = []
    try {
      const raw = localStorage.getItem(CHAT_KEY)
      if (raw) savedMsgs = (JSON.parse(raw) as Message[]).filter((m) => !m.isStreaming && m.text)
    } catch {}
    savedMsgs.forEach((m) => addMessage(m))

    if (savedMsgs.length === 0 && !localStorage.getItem(WELCOME_KEY)) {
      addMessage({ id: randomId(), role: 'ai', text: WELCOME_MESSAGE, time: formatTime(new Date()), isStreaming: false })
      localStorage.setItem(WELCOME_KEY, '1')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    const completed = messages.filter((m) => !m.isStreaming && m.text)
    if (completed.length === 0) return
    try { localStorage.setItem('nestor_chat_v1', JSON.stringify(completed.slice(-100))) } catch {}
  }, [messages])

  // Pick up prefill prompt from HomePage quick actions
  useEffect(() => {
    const prefill = sessionStorage.getItem('nestor_prefill_prompt')
    if (prefill) {
      sessionStorage.removeItem('nestor_prefill_prompt')
      setInput(prefill)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [])

  // AI status check
  useEffect(() => {
    const check = async () => {
      const mode = settings?.aiMode
      if (!mode) { setAiStatus('red'); return }
      if (mode === 'api') { setAiStatus(settings?.apiKey ? 'yellow' : 'red'); return }
      try {
        const status = await window.nestor.ollama.check()
        setAiStatus(status.running && status.hasModel ? 'green' : 'red')
      } catch { setAiStatus('red') }
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [settings?.aiMode, settings?.apiKey, settings?.model])

  // Auto-scroll
  useEffect(() => {
    const el = msgRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isTyping])

  // IPC stream handlers
  const executeActions = useCallback(async (actions: Record<string, string>[]) => {
    for (const action of actions) {
      try {
        let item: HistoryItem | undefined
        if (action.tool === 'create_folder' && action.path) item = await window.nestor.fs.createFolder(action.path)
        else if (action.tool === 'move_file' && action.from && action.to) item = await window.nestor.fs.moveFile(action.from, action.to)
        else if (action.tool === 'rename_file' && action.path && action.newName) item = await window.nestor.fs.renameFile(action.path, action.newName)
        else if (action.tool === 'delete_file' && action.path) item = await window.nestor.fs.deleteFile(action.path)
        else if (action.tool === 'read_file' && action.path) {
          await window.nestor.fs.readFile(action.path)
          const name = action.path.split(/[/\\]/).pop() ?? action.path
          addAccessedFile({ name, path: action.path, color: getFileColor(name), accessedAt: Date.now() })
        }
        if (item) addHistoryItem(item)
      } catch (e) { console.error('Action error:', action, e) }
    }
  }, [addHistoryItem, addAccessedFile])

  useEffect(() => {
    const currentStreamId = { val: '' }
    const unToken = window.nestor.ollama.onToken((token) => { if (currentStreamId.val) appendToken(currentStreamId.val, token) })
    const unDone = window.nestor.ollama.onDone(async () => {
      const sid = currentStreamId.val
      if (!sid) return
      finalizeMessage(sid)
      const msg = useStore.getState().messages.find((m) => m.id === sid)
      if (msg) {
        const { clean, actions } = parseActions(msg.text)
        if (actions.length > 0) {
          useStore.setState((s) => ({ messages: s.messages.map((m) => m.id === sid ? { ...m, text: clean } : m) }))
          await executeActions(actions)
        }
      }
      setTyping(false); setStreamingId(null); currentStreamId.val = ''
    })
    const unError = window.nestor.ollama.onError((err) => {
      const sid = currentStreamId.val
      if (sid) useStore.setState((s) => ({ messages: s.messages.map((m) => m.id === sid ? { ...m, text: friendlyError(err), isStreaming: false } : m) }))
      setTyping(false); setStreamingId(null); currentStreamId.val = ''
    })
    ;(window as { __nestorSetStreamId?: (id: string) => void }).__nestorSetStreamId = (id) => { currentStreamId.val = id }
    return () => { unToken(); unDone(); unError() }
  }, [appendToken, finalizeMessage, setTyping, executeActions])

  // Send message — with optional context files
  const sendMessage = useCallback(async (text: string, files: ContextFile[] = contextFiles) => {
    const trimmed = text.trim()
    if (!trimmed || isTyping) return
    if (!chatStartTime) {
      setChatStartTime(formatTime(new Date()))
      setChatTitle(trimmed.slice(0, 40) + (trimmed.length > 40 ? '…' : ''))
    }
    setFilesInContext(files.length)

    // Build message with context
    let messageContent = trimmed
    if (files.length > 0) {
      const fileContents = await Promise.all(files.map(async (f) => {
        try {
          const content = await window.nestor.fs.readFile(f.path)
          return `\n\n--- Datei: ${f.name} ---\n${content.slice(0, 4000)}`
        } catch { return `\n\n--- Datei: ${f.name} (nicht lesbar) ---` }
      }))
      messageContent = `Kontext-Dateien:${fileContents.join('')}\n\nFrage: ${trimmed}`
    }

    addMessage({ id: randomId(), role: 'user', text: trimmed, chips: files.map((f) => ({ name: f.name, path: f.path, color: f.color })) })
    setInput('')
    setContextFiles([])
    setTyping(true)

    const aiId = randomId()
    addMessage({ id: aiId, role: 'ai', text: '', time: formatTime(new Date()), isStreaming: true })
    setStreamingId(aiId)
    ;(window as { __nestorSetStreamId?: (id: string) => void }).__nestorSetStreamId?.(aiId)

    const history = useStore.getState().messages
      .filter((m) => !m.isStreaming && m.text)
      .map((m) => ({ role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.text }))

    const topLevelNames = fileTree.flatMap((e) => [e.name])
    const systemPrompt = buildSystemPrompt(settings?.rootFolder ?? undefined, topLevelNames)
    await window.nestor.ollama.chat([...history, { role: 'user' as const, content: messageContent }], systemPrompt, settings?.model)
  }, [isTyping, chatStartTime, addMessage, setTyping, setChatStartTime, setChatTitle, settings?.model, setFilesInContext, contextFiles, fileTree, settings?.rootFolder])

  const handleAnchor = useCallback((msg: Message) => {
    addAnchor({ id: randomId(), text: msg.text.slice(0, 60) + (msg.text.length > 60 ? '…' : ''), time: msg.time ?? formatTime(new Date()), messageId: msg.id })
  }, [addAnchor])

  // ── Input handling ────────────────────────────────────────
  const handleInputChange = (value: string) => {
    setInput(value)
    const cursorPos = inputRef.current?.selectionStart ?? value.length
    const beforeCursor = value.slice(0, cursorPos)
    const lastAt = beforeCursor.lastIndexOf('@')
    if (lastAt >= 0 && (lastAt === 0 || beforeCursor[lastAt - 1] === ' ')) {
      const query = beforeCursor.slice(lastAt + 1)
      if (!query.includes(' ')) { setAtQuery(query); setAtStartIdx(lastAt); return }
    }
    setAtQuery(null); setAtStartIdx(-1)
  }

  const handleAtSelect = (file: ContextFile) => {
    const before = input.slice(0, atStartIdx)
    const after = input.slice((inputRef.current?.selectionStart ?? input.length))
    setInput(`${before}@${file.name} ${after}`)
    setAtQuery(null); setAtStartIdx(-1)
    if (!contextFiles.some((f) => f.path === file.path)) setContextFiles((prev) => [...prev, file])
    inputRef.current?.focus()
  }

  // ── Drag & Drop ───────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)

    // Native file drop from Windows Explorer
    if (e.dataTransfer.files.length > 0) {
      for (const nativeFile of Array.from(e.dataTransfer.files)) {
        const path = (nativeFile as File & { path?: string }).path
        if (path) {
          const name = path.split(/[/\\]/).pop() ?? nativeFile.name
          const color = getFileColor(name)
          if (!contextFiles.some((f) => f.path === path)) setContextFiles((prev) => [...prev, { name, path, color }])
          addAccessedFile({ name, path, color, accessedAt: Date.now() })
        }
      }
      return
    }

    const data = e.dataTransfer.getData('nestor/file')
    if (!data) return
    try {
      const file = JSON.parse(data) as ContextFile
      if (!contextFiles.some((f) => f.path === file.path)) setContextFiles((prev) => [...prev, file])
    } catch { }
  }

  const removeContextFile = (path: string) => setContextFiles((prev) => prev.filter((f) => f.path !== path))

  return (
    <div
      className="flex-1 flex flex-col min-w-0"
      style={{ background: 'var(--color-bg)' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-over overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
            style={{ background: 'rgba(37,99,235,0.06)', border: '2px dashed #2563EB', borderRadius: 0 }}
          >
            <div className="flex flex-col items-center gap-3 text-accent">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 12 15 15" />
              </svg>
              <span className="text-[14px] font-semibold">Datei als Kontext hinzufügen</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-[22px] border-b border-border" style={{ height: 56, minHeight: 56 }}>
        {/* Panel toggle: FileTree */}
        <button
          onClick={() => setShowFileTree(!showFileTree)}
          title={showFileTree ? 'Dateibaum ausblenden' : 'Dateibaum einblenden'}
          className="flex items-center justify-center rounded-md text-text-hint transition-colors duration-150 hover:bg-surface btn-press flex-none"
          style={{ width: 28, height: 28 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>

        <div className="flex flex-col gap-px min-w-0 flex-1">
          <span className="text-[14px] font-semibold text-text-primary tracking-tight truncate">{chatTitle}</span>
          {chatStartTime && (
            <span className="text-[12px] text-text-faint truncate">gestartet {chatStartTime}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-none">
          {/* AI Status */}
          <div
            title={STATUS_TOOLTIPS[aiStatus]}
            className="flex items-center gap-[7px] h-[29px] px-[11px] border border-border-strong rounded-full cursor-help"
            style={{ background: 'var(--color-bg)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-none transition-colors duration-500" style={{ background: STATUS_COLORS[aiStatus], boxShadow: `0 0 0 3px ${STATUS_GLOW[aiStatus]}` }} />
            <span className="text-[12px] font-medium text-text-muted whitespace-nowrap">{STATUS_LABELS[aiStatus]}</span>
          </div>

          {/* Proactive analysis */}
          {settings?.rootFolder && fileTree.length > 0 && (
            <button
              onClick={() => {
                const names = fileTree.map((e) => e.name).slice(0, 30).join(', ')
                sendMessage(`Analysiere bitte meinen Ordner und erkläre mir kurz, was du siehst. Gib mir dann 3 konkrete Vorschläge, wie ich ihn besser organisieren könnte. Inhalt: ${names}`, [])
              }}
              disabled={isTyping}
              title="Ordner automatisch analysieren"
              className="btn-press flex items-center gap-1.5 h-[29px] px-3 border border-border-strong rounded-md text-[12.5px] font-medium transition-colors duration-150 hover:bg-surface disabled:opacity-40"
              style={{ background: 'var(--color-bg)', color: '#2563EB', borderColor: '#C7D6F8' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                <path d="M11 8v3M11 14h.01" />
              </svg>
              Analysieren
            </button>
          )}

          {/* New Chat */}
          <button
            onClick={() => { clearMessages(); localStorage.removeItem('nestor_chat_v1') }}
            className="btn-press flex items-center gap-1.5 h-[29px] px-3 border border-border-strong rounded-md text-text-muted text-[12.5px] font-medium transition-colors duration-150 hover:bg-surface"
            style={{ background: 'var(--color-bg)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Neu
          </button>

          {/* Panel toggle: ActivityLog */}
          <button
            onClick={() => setShowActivityLog(!showActivityLog)}
            title={showActivityLog ? 'Aktivitäts-Log ausblenden' : 'Aktivitäts-Log einblenden'}
            className="flex items-center justify-center rounded-md text-text-hint transition-colors duration-150 hover:bg-surface btn-press flex-none"
            style={{ width: 28, height: 28 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={msgRef} className="flex-1 min-h-0 overflow-y-auto py-7" style={{ scrollBehavior: 'smooth' }}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-8">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
              <NestorLogo size={52} className="mx-auto mb-5" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
              <div className="text-[19px] font-semibold text-text-primary tracking-tight mb-2 text-center">Was sollen wir heute organisieren?</div>
              <div className="text-[13.5px] text-text-faint text-center max-w-[360px] mx-auto leading-[1.55] mb-7">
                Ziehe Dateien aus dem Tree in den Chat oder tippe <span className="font-mono text-[12px] bg-surface border border-border-strong rounded px-1.5 py-0.5">@dateiname</span>, um Dateien als Kontext hinzuzufügen.
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4 }}
              className="grid grid-cols-2 gap-3 w-full max-w-[480px]"
            >
              {WORKFLOW_CARDS.map((card, i) => (
                <motion.button
                  key={card.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 + i * 0.06, duration: 0.35 }}
                  onClick={() => sendMessage(card.prompt, [])}
                  className="card-hover text-left flex flex-col gap-2.5 p-4 rounded-xl border border-border-strong"
                  style={{ background: 'var(--color-surface)' }}
                >
                  <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    {card.icon}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary mb-0.5">{card.title}</div>
                    <div className="text-[12px] text-text-hint leading-[1.4]">{card.desc}</div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-5 text-[12px] text-text-hint">
              oder
            </motion.div>
          </div>
        ) : (
          <div className="max-w-[760px] mx-auto px-7 flex flex-col gap-[26px]">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onAnchor={handleAnchor} />
            ))}
            {isTyping && !streamingId && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-center">
                <NestorAnimation size={36} />
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-6 pb-5 pt-3">
        <div className="max-w-[760px] mx-auto">

          {/* Context files */}
          <AnimatePresence>
            {contextFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-1.5 mb-2.5 overflow-hidden"
              >
                {contextFiles.map((f) => (
                  <motion.div
                    key={f.path}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="chip-interactive inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-md border border-border-strong text-[12px] text-text-muted"
                    style={{ background: 'var(--color-surface)' }}
                  >
                    <FileChipIcon color={f.color} />
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button
                      onClick={() => removeContextFile(f.path)}
                      className="flex items-center justify-center w-4 h-4 rounded hover:bg-black/[0.08] transition-colors text-text-hint"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* @ menu */}
          <div className="relative">
            <AnimatePresence>
              {atQuery !== null && (
                <AtMenu
                  query={atQuery}
                  files={allFiles}
                  onSelect={handleAtSelect}
                  onClose={() => { setAtQuery(null); setAtStartIdx(-1) }}
                />
              )}
            </AnimatePresence>

            {/* Input box */}
            <div
              className="flex items-center gap-2 border border-border-strong rounded-xl shadow-input transition-all duration-200 focus-within:border-accent-focus focus-within:shadow-input-focus"
              style={{ padding: '7px 7px 7px 8px', background: 'var(--color-bg)' }}
            >
              <button
                title="Datei anhängen (oder ziehen)"
                onClick={() => { inputRef.current?.focus(); handleInputChange(input + '@') }}
                className="btn-press flex items-center justify-center rounded-btn text-text-faint transition-colors duration-150 hover:bg-surface flex-none"
                style={{ width: 34, height: 34 }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && atQuery === null) {
                    e.preventDefault(); sendMessage(input)
                  }
                }}
                placeholder="Frag Nestor… oder tippe @ für Dateien"
                className="flex-1 min-w-0 h-[34px] border-none outline-none bg-transparent text-[14px] text-text-primary placeholder:text-text-hint"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="btn-press flex items-center justify-center rounded-btn flex-none transition-all duration-150"
                style={{ width: 34, height: 34, background: input.trim() && !isTyping ? ACCENT : 'var(--color-border-strong)', color: input.trim() && !isTyping ? '#fff' : 'var(--color-text-hint)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5.5M6 11l6-6 6 6" />
                </svg>
              </button>
            </div>
          </div>

          <div className="text-center text-[11.5px] text-text-hint mt-2.5 select-none">
            <span className="font-mono border border-border rounded px-1 py-0.5 text-[10.5px]" style={{ background: 'var(--color-surface)' }}>Enter</span>
            {' '}senden · <span className="font-mono">@</span> für Dateien · Deine Daten verlassen dieses Gerät nicht
          </div>
        </div>
      </div>
    </div>
  )
}
