import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'

export default function MarkdownEditor(): React.JSX.Element | null {
  const { openMarkdownFile, setOpenMarkdownFile } = useStore()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(true)
  const [showSavedBadge, setShowSavedBadge] = useState(false)
  const savedBadgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef(content)
  contentRef.current = content

  useEffect(() => {
    if (!openMarkdownFile) return
    setLoading(true)
    window.nestor.fs.readFile(openMarkdownFile.path)
      .then((c: string) => { setContent(c); setSaved(true) })
      .catch(() => setContent(''))
      .finally(() => setLoading(false))
  }, [openMarkdownFile?.path])

  const triggerSavedBadge = useCallback(() => {
    setShowSavedBadge(true)
    if (savedBadgeTimer.current) clearTimeout(savedBadgeTimer.current)
    savedBadgeTimer.current = setTimeout(() => setShowSavedBadge(false), 1600)
  }, [])

  const flushSave = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    if (openMarkdownFile && !saved) {
      await window.nestor.fs.writeFile(openMarkdownFile.path, contentRef.current)
      setSaved(true)
      triggerSavedBadge()
    }
  }, [openMarkdownFile, saved, triggerSavedBadge])

  // Ctrl+S to save immediately
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        flushSave()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [flushSave])

  // Flush on unmount (file closed / component removed)
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      if (savedBadgeTimer.current) {
        clearTimeout(savedBadgeTimer.current)
        savedBadgeTimer.current = null
      }
      if (openMarkdownFile && !saved) {
        window.nestor.fs.writeFile(openMarkdownFile.path, contentRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMarkdownFile?.path])

  const handleChange = (value: string) => {
    setContent(value)
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (openMarkdownFile) {
        await window.nestor.fs.writeFile(openMarkdownFile.path, value)
        setSaved(true)
        triggerSavedBadge()
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
          <div className="text-[11px] text-text-hint mt-0.5 flex items-center gap-1">
            <AnimatePresence mode="wait">
              {saved ? (
                showSavedBadge ? (
                  <motion.span
                    key="saved-flash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ color: '#16A34A' }}
                  >
                    ✓ Gespeichert
                  </motion.span>
                ) : (
                  <motion.span
                    key="saved-idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    Gespeichert
                  </motion.span>
                )
              ) : (
                <motion.span
                  key="unsaved"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  Nicht gespeichert…
                </motion.span>
              )}
            </AnimatePresence>
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
