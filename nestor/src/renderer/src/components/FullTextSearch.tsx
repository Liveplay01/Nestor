import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'
import type { SearchResult } from '@shared/types'

interface Props {
  onClose: () => void
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded px-0.5" style={{ background: 'var(--color-accent)', color: '#fff', fontWeight: 600 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function FullTextSearch({ onClose }: Props): React.JSX.Element {
  const { setActiveNav } = useStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await window.nestor.fs.searchFullText(q)
      setResults(res)
      setSelected(0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const handleKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && results[selected]) openResult(results[selected])
  }

  const openResult = (r: SearchResult): void => {
    window.nestor.shell.showInFolder(r.file.path)
    setActiveNav('files')
    onClose()
  }

  const formatPath = (p: string): string => {
    const parts = p.replace(/\\/g, '/').split('/')
    return parts.slice(-3, -1).join(' / ')
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-24"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[640px] rounded-2xl shadow-2xl overflow-hidden border border-border-strong"
        style={{ background: 'var(--color-surface)', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-hint flex-none">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder="Dateiinhalt durchsuchen… (min. 2 Zeichen)"
            className="flex-1 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-hint"
          />
          {loading && (
            <svg className="animate-spin flex-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
            </svg>
          )}
          <kbd className="text-[11px] text-text-hint border border-border rounded px-1.5 py-0.5 leading-none">Esc</kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">
          {query.length < 2 && !loading && (
            <div className="px-5 py-10 text-center text-[13px] text-text-hint">
              Gib mindestens 2 Zeichen ein um Dateiinhalte zu durchsuchen.
              <div className="mt-2 text-[12px] text-text-faint">Unterstützte Formate: .txt .md .json .csv .xml .html .js .ts .css und mehr</div>
            </div>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-text-hint">
              Keine Treffer für „{query}"
            </div>
          )}

          {results.map((r, i) => (
            <button
              key={r.file.path}
              onClick={() => openResult(r)}
              onMouseEnter={() => setSelected(i)}
              className="w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors"
              style={{ background: selected === i ? 'var(--color-accent-faint, rgba(37,99,235,0.06))' : 'transparent' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex-none w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
                  style={{ background: 'var(--color-accent)', color: '#fff', opacity: 0.85 }}
                >
                  {r.file.name.split('.').pop()?.slice(0, 3).toUpperCase() ?? 'TXT'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13.5px] font-semibold text-text-primary truncate">{r.file.name}</span>
                    {r.matchCount > 1 && (
                      <span className="text-[11px] text-text-hint flex-none">{r.matchCount} Treffer</span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-text-hint mt-0.5 truncate">{formatPath(r.file.path)}</div>
                  <div className="text-[12.5px] text-text-muted mt-1 font-mono leading-relaxed" style={{ wordBreak: 'break-all' }}>
                    <span className="text-text-hint mr-2 select-none">:{r.lineNumber}</span>
                    {highlight(r.linePreview, query)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-border flex items-center gap-2 text-[11.5px] text-text-hint">
            <span>{results.length} Ergebnis{results.length !== 1 ? 'se' : ''}</span>
            <span className="ml-auto">↑↓ navigieren · Enter öffnen</span>
          </div>
        )}
      </div>
    </div>
  )
}
