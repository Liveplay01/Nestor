import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { getFileColor } from '../lib/fileColors'
import { SYSTEM_PROMPT } from '../lib/systemPrompt'
import { randomId, formatTime } from '../lib/utils'
import type { Message, HistoryItem, AccessedFile } from '@shared/types'

const ACCENT = '#2563EB'

function parseActions(text: string): { clean: string; actions: Record<string, string>[] } {
  const actions: Record<string, string>[] = []
  const clean = text.replace(/<action>([\s\S]*?)<\/action>/g, (_, json: string) => {
    try { actions.push(JSON.parse(json.trim())) } catch { /* skip */ }
    return ''
  }).trim()
  return { clean, actions }
}

function TypingDots(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1" style={{ height: 27 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="block rounded-full"
          style={{ width: 6, height: 6, background: '#C4C4CA', animation: `dot 1.2s infinite ${i * 0.18}s` }}
        />
      ))}
    </div>
  )
}

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
      <motion.div initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }} className="flex justify-end">
        <div className="text-[14px] leading-relaxed text-text-primary" style={{ maxWidth: '80%', background: '#F4F4F5', padding: '10px 15px', borderRadius: '16px 16px 5px 16px' }}>
          {msg.text}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }} className="flex gap-3 group">
      <div className="flex items-center justify-center rounded-lg flex-none" style={{ width: 27, height: 27, background: ACCENT }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2.6l1.7 5.9 5.9 1.7-5.9 1.7L12 18.4l-1.7-6.5-5.9-1.7 5.9-1.7L12 2.6z" /></svg>
      </div>
      <div className="flex-1 min-w-0 pt-px">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[13px] font-semibold text-text-primary">Nestor</span>
          {msg.time && <span className="text-[11.5px] text-text-hint">{msg.time}</span>}
          <button onClick={() => onAnchor(msg)} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-text-hint hover:text-[#2563EB]" title="Als Ankerpunkt speichern">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3.5h12a.5.5 0 0 1 .5.5v16l-6.5-4.3L5.5 20V4a.5.5 0 0 1 .5-.5z" /></svg>
          </button>
        </div>
        <div className="text-[14px] leading-[1.65] text-text-secondary whitespace-pre-wrap">
          {msg.text}
          {msg.isStreaming && <span className="inline-block w-0.5 h-4 bg-accent ml-px animate-pulse" />}
        </div>
        {msg.chips && msg.chips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {msg.chips.map((c, i) => (
              <button key={i} className="inline-flex items-center gap-[7px] h-[31px] px-3 pl-2.5 border border-border-strong rounded-md bg-white text-[12.5px] font-medium text-text-secondary transition-all duration-150 hover:bg-surface hover:border-[#D9D9DD]">
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

const SUGGESTIONS = ['Downloads aufräumen', 'Steuerdokumente suchen', 'Fotos nach Datum sortieren']

export default function Chat(): React.JSX.Element {
  const {
    messages, addMessage, appendToken, finalizeMessage, clearMessages,
    isTyping, setTyping, chatTitle, setChatTitle, chatStartTime, setChatStartTime,
    filesInContext, settings, addHistoryItem, addAnchor, addAccessedFile
  } = useStore()

  const [input, setInput] = useState('')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const msgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = msgRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isTyping])

  const executeActions = useCallback(async (actions: Record<string, string>[]) => {
    for (const action of actions) {
      try {
        let item: HistoryItem | undefined
        if (action.tool === 'create_folder' && action.path) {
          item = await window.nestor.fs.createFolder(action.path)
        } else if (action.tool === 'move_file' && action.from && action.to) {
          item = await window.nestor.fs.moveFile(action.from, action.to)
        } else if (action.tool === 'rename_file' && action.path && action.newName) {
          item = await window.nestor.fs.renameFile(action.path, action.newName)
        } else if (action.tool === 'delete_file' && action.path) {
          item = await window.nestor.fs.deleteFile(action.path)
        } else if (action.tool === 'read_file' && action.path) {
          await window.nestor.fs.readFile(action.path)
          const name = action.path.split(/[/\\]/).pop() ?? action.path
          const af: AccessedFile = { name, path: action.path, color: getFileColor(name), accessedAt: Date.now() }
          addAccessedFile(af)
        }
        if (item) addHistoryItem(item)
      } catch (e) {
        console.error('Action error:', action, e)
      }
    }
  }, [addHistoryItem, addAccessedFile])

  useEffect(() => {
    const currentStreamId = { val: '' }

    const unToken = window.nestor.ollama.onToken((token) => {
      if (currentStreamId.val) appendToken(currentStreamId.val, token)
    })
    const unDone = window.nestor.ollama.onDone(async () => {
      const sid = currentStreamId.val
      if (!sid) return
      finalizeMessage(sid)
      const msg = useStore.getState().messages.find((m) => m.id === sid)
      if (msg) {
        const { clean, actions } = parseActions(msg.text)
        if (actions.length > 0) {
          useStore.setState((s) => ({
            messages: s.messages.map((m) => m.id === sid ? { ...m, text: clean } : m)
          }))
          await executeActions(actions)
        }
      }
      setTyping(false)
      setStreamingId(null)
      currentStreamId.val = ''
    })
    const unError = window.nestor.ollama.onError((err) => {
      const sid = currentStreamId.val
      if (sid) {
        useStore.setState((s) => ({
          messages: s.messages.map((m) =>
            m.id === sid ? { ...m, text: `Fehler: ${err}`, isStreaming: false } : m
          )
        }))
      }
      setTyping(false)
      setStreamingId(null)
      currentStreamId.val = ''
    })

    // Expose so sendMessage can set the current streaming ID
    ;(window as { __nestorSetStreamId?: (id: string) => void }).__nestorSetStreamId =
      (id: string) => { currentStreamId.val = id }

    return () => { unToken(); unDone(); unError() }
  }, [appendToken, finalizeMessage, setTyping, executeActions])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isTyping) return

    if (!chatStartTime) {
      setChatStartTime(formatTime(new Date()))
      setChatTitle(trimmed.slice(0, 40) + (trimmed.length > 40 ? '…' : ''))
    }

    addMessage({ id: randomId(), role: 'user', text: trimmed })
    setInput('')
    setTyping(true)

    const aiId = randomId()
    addMessage({ id: aiId, role: 'ai', text: '', time: formatTime(new Date()), isStreaming: true })
    setStreamingId(aiId)
    ;(window as { __nestorSetStreamId?: (id: string) => void }).__nestorSetStreamId?.(aiId)

    const history = useStore.getState().messages
      .filter((m) => !m.isStreaming && m.text)
      .map((m) => ({ role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.text }))

    await window.nestor.ollama.chat(
      [...history, { role: 'user' as const, content: trimmed }],
      SYSTEM_PROMPT,
      settings?.model
    )
  }, [isTyping, chatStartTime, addMessage, setTyping, setChatStartTime, setChatTitle, settings?.model])

  const handleAnchor = useCallback((msg: Message) => {
    addAnchor({
      id: randomId(),
      text: msg.text.slice(0, 60) + (msg.text.length > 60 ? '…' : ''),
      time: msg.time ?? formatTime(new Date()),
      messageId: msg.id
    })
  }, [addAnchor])

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-[22px] border-b border-border" style={{ height: 56, minHeight: 56 }}>
        <div className="flex flex-col gap-px min-w-0 flex-1">
          <span className="text-[14px] font-semibold text-text-primary tracking-tight truncate">{chatTitle}</span>
          {chatStartTime && (
            <span className="text-[12px] text-text-faint truncate">
              {filesInContext > 0 ? `${filesInContext} Dateien im Kontext · ` : ''}gestartet {chatStartTime}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 flex-none">
          <div className="flex items-center gap-[7px] h-[29px] px-[11px] border border-border-strong rounded-full bg-white">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 flex-none" style={{ boxShadow: '0 0 0 3px #16A34A24' }} />
            <span className="text-[12px] font-medium text-text-muted whitespace-nowrap">Läuft lokal</span>
          </div>
          <button onClick={clearMessages} className="flex items-center gap-1.5 h-[29px] px-3 border border-border-strong rounded-md bg-white text-text-muted text-[12.5px] font-medium transition-all duration-150 hover:bg-surface hover:border-[#E0E0E3]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Neuer Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={msgRef} className="flex-1 min-h-0 overflow-y-auto py-7" style={{ scrollBehavior: 'smooth' }}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="flex items-center justify-center mb-5 rounded-[14px]" style={{ width: 50, height: 50, background: '#2563EB16' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#2563EB" stroke="none"><path d="M12 2.6l1.7 5.9 5.9 1.7-5.9 1.7L12 18.4l-1.7-6.5-5.9-1.7 5.9-1.7L12 2.6z" /></svg>
            </div>
            <div className="text-[19px] font-semibold text-text-primary tracking-tight mb-[7px]">Was sollen wir heute organisieren?</div>
            <div className="text-[13.5px] text-text-faint max-w-[380px] leading-[1.55] mb-6">
              Frag Nestor, Dateien zu finden, zu sortieren, umzubenennen oder zu erstellen. Alles läuft lokal – keine Daten verlassen dieses Gerät.
            </div>
            <div className="flex flex-wrap gap-[9px] justify-center max-w-[440px]">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => sendMessage(s)} className="h-[33px] px-[14px] border border-border-strong rounded-full bg-white text-[12.5px] font-medium text-text-muted transition-all duration-150 hover:bg-surface hover:border-[#D9D9DD]">{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-[760px] mx-auto px-7 flex flex-col gap-[26px]">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onAnchor={handleAnchor} />
            ))}
            {isTyping && !streamingId && (
              <motion.div initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <div className="flex items-center justify-center rounded-lg flex-none" style={{ width: 27, height: 27, background: ACCENT }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2.6l1.7 5.9 5.9 1.7-5.9 1.7L12 18.4l-1.7-6.5-5.9-1.7 5.9-1.7L12 2.6z" /></svg>
                </div>
                <TypingDots />
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 pb-5 pt-3.5">
        <div className="max-w-[760px] mx-auto">
          <div className="flex items-center gap-2 border border-[#E6E6E9] rounded-xl bg-white shadow-input transition-all duration-150 focus-within:border-accent-focus focus-within:shadow-input-focus" style={{ padding: '7px 7px 7px 8px' }}>
            <button className="flex items-center justify-center rounded-btn text-text-faint transition-colors duration-150 hover:bg-black/[0.04] flex-none" style={{ width: 34, height: 34 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-7.6-12.3" /><path d="M15.5 8.5l-6 6a2.12 2.12 0 0 0 3 3l6.5-6.5a4 4 0 0 0-5.7-5.6L6.5 6" />
              </svg>
            </button>
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder="Frag Nestor, Dateien zu organisieren, finden oder erstellen…"
              className="flex-1 min-w-0 h-[34px] border-none outline-none bg-transparent text-[14px] text-text-primary placeholder:text-text-hint"
            />
            <button onClick={() => sendMessage(input)} disabled={!input.trim()}
              className="flex items-center justify-center rounded-btn flex-none transition-all duration-150 active:scale-90"
              style={{ width: 34, height: 34, background: input.trim() ? ACCENT : '#E4E4E7', color: input.trim() ? '#fff' : '#A1A1AA' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5.5M6 11l6-6 6 6" /></svg>
            </button>
          </div>
          <div className="text-center text-[11.5px] text-text-hint mt-2.5">
            Nestor kann Dateien lesen und organisieren · Deine Daten verlassen dieses Gerät nicht
          </div>
        </div>
      </div>
    </div>
  )
}
