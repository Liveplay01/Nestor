import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { getFileColor } from '../lib/fileColors'
import type { FileEntry } from '@shared/types'

interface Props {
  open: boolean
  onClose: () => void
}

function flattenAll(entries: FileEntry[], out: FileEntry[] = []): FileEntry[] {
  for (const e of entries) {
    out.push(e)
    if (e.children) flattenAll(e.children, out)
  }
  return out
}

function FileTypeIcon({ entry }: { entry: FileEntry }): React.JSX.Element {
  if (entry.isFolder) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5V17a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 17V7.5z" />
      </svg>
    )
  }
  const color = getFileColor(entry.name)
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export default function CommandPalette({ open, onClose }: Props): React.JSX.Element | null {
  const { fileTree, setActiveNav, addAccessedFile } = useStore()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allEntries = useMemo(() => flattenAll(fileTree), [fileTree])

  const results = useMemo(() => {
    if (!query.trim()) return allEntries.slice(0, 10)
    const q = query.toLowerCase()
    return allEntries.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 10)
  }, [query, allEntries])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      // Slight delay so the motion animation finishes before focus
      const t = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  // Keep selected item in view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const handleSelect = useCallback((entry: FileEntry) => {
    onClose()
    if (entry.isFolder) {
      setActiveNav('files')
    } else {
      addAccessedFile({
        name: entry.name,
        path: entry.path,
        color: getFileColor(entry.name),
        accessedAt: Date.now()
      })
      sessionStorage.setItem('nestor_open_file', entry.path)
      setActiveNav('chat')
    }
  }, [onClose, setActiveNav, addAccessedFile])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIdx]) handleSelect(results[selectedIdx])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-start justify-center"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)', paddingTop: '15vh' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-[460px] max-w-[90vw] rounded-xl border border-border-strong overflow-hidden"
            style={{ background: 'var(--color-bg)', boxShadow: '0 24px 64px -12px rgba(0,0,0,0.22), 0 4px 16px -4px rgba(0,0,0,0.12)' }}
          >
            {/* Search row */}
            <div
              className="flex items-center gap-3 px-4 border-b"
              style={{ height: 50, borderColor: 'var(--color-border-strong)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="1.9" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0) }}
                onKeyDown={handleKeyDown}
                placeholder="Datei suchen…"
                className="flex-1 bg-transparent outline-none text-[14px] text-text-primary placeholder:text-text-hint"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); inputRef.current?.focus() }}
                  className="text-text-hint hover:text-text-muted transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
              <kbd
                className="text-[10.5px] font-medium px-1.5 py-0.5 rounded border border-border-strong text-text-hint font-mono"
                style={{ background: 'var(--color-surface)' }}
              >
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} style={{ maxHeight: 300 }} className="overflow-y-auto">
              {results.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-text-faint">
                  Keine Ergebnisse für „{query}"
                </div>
              ) : (
                results.map((entry, i) => (
                  <div
                    key={entry.path}
                    onClick={() => handleSelect(entry)}
                    onMouseEnter={() => setSelectedIdx(i)}
                    className="flex items-center gap-3 px-4 py-[9px] cursor-default transition-colors"
                    style={{ background: i === selectedIdx ? 'var(--color-surface)' : 'transparent' }}
                  >
                    <span className="flex-none flex items-center justify-center" style={{ width: 20 }}>
                      <FileTypeIcon entry={entry} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-text-primary truncate">{entry.name}</div>
                      <div className="text-[11px] text-text-hint truncate">{entry.path}</div>
                    </div>
                    {i === selectedIdx && (
                      <kbd className="text-[10px] text-text-hint font-mono opacity-60">↵</kbd>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center gap-4 px-4 py-2 border-t text-[11px] text-text-hint select-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <span className="flex items-center gap-1">
                <kbd className="font-mono">↑↓</kbd> navigieren
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono">↵</kbd> öffnen
              </span>
              <span className="ml-auto font-mono opacity-50">Ctrl+P</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
