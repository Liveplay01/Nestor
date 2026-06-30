import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { SavedAction } from '@shared/types'

const ICON_OPTIONS = ['⚡', '📁', '🔍', '🗑️', '✏️', '📸', '📄', '🎯', '🧹', '📦', '🔄', '⭐']

interface Props {
  initial?: SavedAction
  onSave: (action: SavedAction) => void
  onClose: () => void
}

export default function SavedActionDialog({ initial, onSave, onClose }: Props): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '⚡')
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => {
    if (!name.trim()) { setError('Bitte gib einen Namen ein.'); return }
    if (!prompt.trim()) { setError('Bitte gib einen Prompt ein.'); return }
    onSave({
      id: initial?.id ?? Math.random().toString(36).slice(2),
      name: name.trim(),
      icon,
      prompt: prompt.trim(),
      createdAt: initial?.createdAt ?? Date.now()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        className="rounded-2xl border border-border-strong shadow-window overflow-hidden"
        style={{ background: 'var(--color-bg)', width: 440 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-[14.5px] font-semibold text-text-primary">
            {initial ? 'Schnellaktion bearbeiten' : 'Neue Schnellaktion'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-surface text-text-hint"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">

          {/* Icon picker */}
          <div>
            <label className="block text-[12px] font-semibold text-text-hint uppercase tracking-wider mb-2">Symbol</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setIcon(e)}
                  className="w-9 h-9 rounded-xl text-[18px] flex items-center justify-center border transition-all duration-100"
                  style={{
                    background: icon === e ? 'var(--color-accent)10' : 'var(--color-surface)',
                    borderColor: icon === e ? 'var(--color-accent)' : 'var(--color-border)'
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[12px] font-semibold text-text-hint uppercase tracking-wider mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="z.B. Downloads aufräumen"
              maxLength={40}
              className="w-full h-9 px-3 rounded-xl border border-border text-[13.5px] text-text-primary placeholder:text-text-hint outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-focus"
              style={{ background: 'var(--color-surface)' }}
              autoFocus
            />
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-[12px] font-semibold text-text-hint uppercase tracking-wider mb-1.5">KI-Anweisung</label>
            <textarea
              value={prompt}
              onChange={e => { setPrompt(e.target.value); setError('') }}
              placeholder="z.B. Analysiere meinen Download-Ordner und sortiere Dateien nach Typ in Unterordner."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-[13px] text-text-primary placeholder:text-text-hint outline-none transition-all resize-none focus:border-[var(--color-accent)] focus:shadow-focus"
              style={{ background: 'var(--color-surface)' }}
            />
          </div>

          {/* Preview */}
          {name && (
            <div>
              <label className="block text-[12px] font-semibold text-text-hint uppercase tracking-wider mb-1.5">Vorschau</label>
              <div
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border-strong"
                style={{ background: 'var(--color-surface)' }}
              >
                <span className="text-[22px] flex-none">{icon}</span>
                <span className="text-[13.5px] font-medium text-text-secondary truncate">{name}</span>
              </div>
            </div>
          )}

          {error && <p className="text-[12.5px] text-[#DC2626]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border" style={{ background: 'var(--color-surface)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[13px] font-medium text-text-muted border border-border transition-colors hover:bg-surface btn-press"
            style={{ background: 'var(--color-bg)' }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 btn-press"
            style={{ background: 'var(--color-accent)' }}
          >
            {initial ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
