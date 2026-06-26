import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

export default function MarkdownEditor(): React.JSX.Element | null {
  const { openMarkdownFile, setOpenMarkdownFile } = useStore()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!openMarkdownFile) return
    setLoading(true)
    window.nestor.fs.readFile(openMarkdownFile.path)
      .then((c: string) => { setContent(c); setSaved(true) })
      .catch(() => setContent(''))
      .finally(() => setLoading(false))
  }, [openMarkdownFile?.path])

  const handleChange = (value: string) => {
    setContent(value)
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (openMarkdownFile) {
        await window.nestor.fs.writeFile(openMarkdownFile.path, value)
        setSaved(true)
      }
    }, 800)
  }

  if (!openMarkdownFile) return null

  return (
    <div
      className="flex flex-col border-r border-border"
      style={{ width: 340, minWidth: 240, background: 'var(--color-surface)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 border-b border-border"
        style={{ height: 56, minHeight: 56 }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-text-primary truncate">{openMarkdownFile.name}</div>
          <div className="text-[11px] text-text-hint mt-0.5">
            {saved ? 'Gespeichert' : 'Nicht gespeichert…'}
          </div>
        </div>
        <button
          onClick={() => setOpenMarkdownFile(null)}
          className="flex items-center justify-center rounded-md text-text-faint transition-colors hover:bg-black/[0.05]"
          style={{ width: 26, height: 26 }}
          title="Schließen"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Editor */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
          </svg>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 resize-none outline-none text-[13px] leading-[1.7] font-mono"
          style={{
            padding: '16px 18px',
            background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            border: 'none'
          }}
          spellCheck={false}
          placeholder="Beginne zu schreiben…"
        />
      )}
    </div>
  )
}
