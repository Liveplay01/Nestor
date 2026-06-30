import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function basename(p: string): string {
  return p.split(/[/\\]/).pop() ?? p
}

function dirname(p: string): string {
  const parts = p.split(/[/\\]/)
  return parts.slice(0, -1).join('\\')
}

interface GroupState {
  keepIdx: number
  toDelete: Set<number>
}

export default function DuplicateFinder({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { addToast, addHistoryItem } = useStore()
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'results' | 'done'>('idle')
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [groupStates, setGroupStates] = useState<Map<string, GroupState>>(new Map())
  const [deleting, setDeleting] = useState(false)

  const scan = useCallback(async () => {
    setPhase('scanning')
    try {
      const result = await window.nestor.fs.findDuplicates()
      setGroups(result)
      const stateMap = new Map<string, GroupState>()
      for (const g of result) {
        // By default: keep the oldest file (index 0 after sorting by modified asc), mark the rest
        const sorted = [...g.files].map((f, i) => ({ ...f, origIdx: i }))
          .sort((a, b) => a.modified - b.modified)
        const keepOrigIdx = sorted[0].origIdx
        const toDelete = new Set(g.files.map((_, i) => i).filter(i => i !== keepOrigIdx))
        stateMap.set(g.hash, { keepIdx: keepOrigIdx, toDelete })
      }
      setGroupStates(stateMap)
      setPhase('results')
    } catch (err) {
      addToast({ type: 'error', message: 'Fehler beim Scannen: ' + (err as Error).message })
      setPhase('idle')
    }
  }, [addToast])

  const setKeep = useCallback((hash: string, idx: number) => {
    setGroupStates(prev => {
      const next = new Map(prev)
      const group = groups.find(g => g.hash === hash)!
      const toDelete = new Set(group.files.map((_, i) => i).filter(i => i !== idx))
      next.set(hash, { keepIdx: idx, toDelete })
      return next
    })
  }, [groups])

  const totalWaste = groups.reduce((sum, g) => {
    const state = groupStates.get(g.hash)
    if (!state) return sum
    return sum + g.size * state.toDelete.size
  }, 0)

  const totalToDelete = groups.reduce((sum, g) => {
    const state = groupStates.get(g.hash)
    return sum + (state?.toDelete.size ?? 0)
  }, 0)

  const deleteMarked = useCallback(async () => {
    setDeleting(true)
    let deleted = 0
    let failed = 0
    for (const g of groups) {
      const state = groupStates.get(g.hash)
      if (!state) continue
      for (const idx of state.toDelete) {
        const file = g.files[idx]
        try {
          const item = await window.nestor.fs.deleteFile(file.path)
          addHistoryItem(item)
          deleted++
        } catch {
          failed++
        }
      }
    }
    setDeleting(false)
    setPhase('done')
    if (failed > 0) {
      addToast({ type: 'error', message: `${deleted} Dateien gelöscht, ${failed} fehlgeschlagen.` })
    } else {
      addToast({ type: 'success', message: `${deleted} Duplikat${deleted !== 1 ? 'e' : ''} gelöscht · ${formatSize(totalWaste)} freigegeben` })
    }
  }, [groups, groupStates, addHistoryItem, addToast, totalWaste])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="relative flex flex-col rounded-2xl border border-border-strong shadow-window overflow-hidden"
        style={{ background: 'var(--color-bg)', width: 640, maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-none">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Duplikate-Finder</h2>
            <p className="text-[12.5px] text-text-faint mt-0.5">Findet Dateien mit identischem Inhalt</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-surface text-text-hint"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {phase === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 px-8 text-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-border-strong" style={{ background: 'var(--color-surface)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <circle cx="12" cy="10" r="3" />
                    <path d="M12 2v5M12 13v9" opacity="0" />
                    <path d="M8 10H4M20 10h-4" />
                    <circle cx="12" cy="10" r="6" />
                    <path d="M9 7l6 6M15 7l-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-text-primary mb-1">Dateien mit identischem Inhalt finden</p>
                  <p className="text-[13px] text-text-faint max-w-sm">Nestor vergleicht alle Dateien in deinem Arbeitsordner anhand ihres Inhalts – nicht nur nach Dateinamen.</p>
                </div>
                <button
                  onClick={scan}
                  className="px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 btn-press"
                  style={{ background: 'var(--color-accent)' }}
                >
                  Duplikate suchen
                </button>
              </motion.div>
            )}

            {phase === 'scanning' && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-8 h-8 border-2 border-border rounded-full border-t-[var(--color-accent)] animate-spin" />
                <p className="text-[13.5px] text-text-muted">Dateien werden verglichen…</p>
              </motion.div>
            )}

            {phase === 'results' && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {groups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
                    </svg>
                    <p className="text-[14px] font-medium text-text-primary">Keine Duplikate gefunden!</p>
                    <p className="text-[13px] text-text-faint">Dein Ordner enthält keine doppelten Dateien.</p>
                  </div>
                ) : (
                  <div>
                    {/* Summary bar */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-border" style={{ background: 'var(--color-surface)' }}>
                      <span className="text-[13px] text-text-muted">
                        <span className="font-semibold text-text-primary">{groups.length}</span> Gruppen · <span className="font-semibold text-text-primary">{totalToDelete}</span> Dateien markiert
                      </span>
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--color-accent)' }}>
                        {formatSize(totalWaste)} freizugeben
                      </span>
                    </div>

                    {/* Groups */}
                    <div className="divide-y divide-border">
                      {groups.map((g) => {
                        const state = groupStates.get(g.hash)!
                        return (
                          <div key={g.hash} className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-2.5">
                              <span className="text-[12px] font-semibold text-text-hint uppercase tracking-wider">
                                {formatSize(g.size)} · {g.files.length} Kopien
                              </span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {g.files.map((file, idx) => {
                                const isKeep = state.keepIdx === idx
                                const isDelete = state.toDelete.has(idx)
                                return (
                                  <button
                                    key={file.path}
                                    onClick={() => setKeep(g.hash, idx)}
                                    className="flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-100"
                                    style={{
                                      background: isKeep ? 'rgba(22,163,74,0.07)' : isDelete ? 'rgba(220,38,38,0.05)' : 'var(--color-surface)',
                                      borderColor: isKeep ? '#16A34A40' : isDelete ? '#DC262640' : 'var(--color-border)'
                                    }}
                                  >
                                    <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex-none flex items-center justify-center"
                                      style={{ borderColor: isKeep ? '#16A34A' : '#DC2626' }}>
                                      {isKeep && <div className="w-2 h-2 rounded-full bg-[#16A34A]" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-medium text-text-primary truncate">{basename(file.path)}</span>
                                        {isKeep && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-[#16A34A20] text-[#16A34A]">Behalten</span>}
                                        {isDelete && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-[#DC262620] text-[#DC2626]">Löschen</span>}
                                      </div>
                                      <div className="text-[11.5px] text-text-faint mt-0.5 truncate">{dirname(file.path)}</div>
                                      <div className="text-[11.5px] text-text-hint mt-0.5">Geändert: {formatDate(file.modified)}</div>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {phase === 'done' && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
                </svg>
                <p className="text-[14px] font-medium text-text-primary">Duplikate erfolgreich entfernt!</p>
                <p className="text-[13px] text-text-faint">Die Dateien wurden in den Papierkorb verschoben.</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        {phase === 'results' && groups.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border flex-none" style={{ background: 'var(--color-surface)' }}>
            <button
              onClick={() => setPhase('idle')}
              className="px-4 py-2 rounded-xl text-[13px] font-medium text-text-muted border border-border transition-colors hover:bg-surface btn-press"
              style={{ background: 'var(--color-bg)' }}
            >
              Neu scannen
            </button>
            <button
              onClick={deleteMarked}
              disabled={deleting || totalToDelete === 0}
              className="px-5 py-2 rounded-xl text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 btn-press disabled:opacity-40"
              style={{ background: '#DC2626' }}
            >
              {deleting ? 'Wird gelöscht…' : `${totalToDelete} Dateien in Papierkorb`}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
