import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import type { HistoryItem } from '@shared/types'

const DOT_COLORS: Record<string, string> = {
  create_folder: '#16A34A',
  create_file: '#16A34A',
  move_file: 'var(--color-accent)',
  rename_file: '#A1A1AA',
  delete_file: '#EF4444'
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function RescueCenter(): React.JSX.Element {
  const { history, setHistory, markUndone, addToast } = useStore()
  const [undoingAll, setUndoingAll] = useState(false)
  const [multiSelect, setMultiSelect] = useState<Set<string>>(new Set())

  useEffect(() => {
    window.nestor.history.get().then((h) => {
      if (Array.isArray(h)) setHistory(h as Parameters<typeof setHistory>[0])
    })
    const unsub = window.nestor.history.onUpdated((items) => {
      setHistory(items as Parameters<typeof setHistory>[0])
    })
    return unsub
  }, [setHistory])

  const undoable = history.filter((h) => !h.undone)

  const handleUndo = async (id: string) => {
    markUndone(id)
    try {
      await window.nestor.fs.undo(id)
    } catch {
      addToast({ type: 'error', message: 'Rückgängig machen fehlgeschlagen.' })
    }
  }

  const handleUndoSelected = async () => {
    const ids = [...multiSelect]
    if (ids.length === 0) return
    setUndoingAll(true)
    try {
      const result = await window.nestor.fs.undoAll(ids)
      result.succeeded.forEach((id) => markUndone(id))
      if (result.failed.length > 0) {
        addToast({ type: 'error', message: `${result.failed.length} Aktion(en) konnten nicht rückgängig gemacht werden.` })
      } else {
        addToast({ type: 'success', message: `${result.succeeded.length} Aktion(en) rückgängig gemacht.` })
      }
    } catch {
      addToast({ type: 'error', message: 'Rückgängig machen fehlgeschlagen.' })
    }
    setMultiSelect(new Set())
    setUndoingAll(false)
  }

  const handleUndoAll = async () => {
    const ids = undoable.map((h) => h.id)
    if (ids.length === 0) return
    setUndoingAll(true)
    try {
      const result = await window.nestor.fs.undoAll(ids)
      result.succeeded.forEach((id) => markUndone(id))
      if (result.failed.length > 0) {
        addToast({ type: 'error', message: `${result.failed.length} Aktion(en) konnten nicht rückgängig gemacht werden.` })
      } else {
        addToast({ type: 'success', message: `Alle ${result.succeeded.length} Aktionen rückgängig gemacht.` })
      }
    } catch {
      addToast({ type: 'error', message: 'Rückgängig machen fehlgeschlagen.' })
    }
    setUndoingAll(false)
  }

  const toggleSelect = (id: string) => {
    setMultiSelect((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border">
        <div className="flex items-start justify-between gap-4 max-w-[780px]">
          <div>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mb-1">Rettungscenter</h1>
            <p className="text-[13.5px] text-text-muted leading-[1.5]">
              Hier kannst du jede Änderung rückgängig machen, den Papierkorb öffnen oder alle Nestor-Aktionen auf einmal zurücksetzen.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <button
              onClick={() => window.nestor.shell.openExternal('shell:RecycleBinFolder')}
              className="h-8 px-3.5 rounded-lg border border-border-strong text-[12.5px] font-medium text-text-muted transition-colors hover:bg-surface"
              style={{ background: 'var(--color-bg)' }}
              title="Windows-Papierkorb öffnen"
            >
              🗑 Papierkorb öffnen
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[780px] w-full flex flex-col gap-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Aktionen gesamt', value: history.length },
            { label: 'Noch aktiv', value: undoable.length },
            { label: 'Rückgängig gemacht', value: history.filter(h => h.undone).length }
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border-strong px-5 py-4"
              style={{ background: 'var(--color-surface)' }}
            >
              <div className="text-[22px] font-semibold text-text-primary">{stat.value}</div>
              <div className="text-[12px] text-text-hint mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Bulk actions toolbar */}
        {undoable.length > 0 && (
          <div className="flex items-center gap-3">
            {multiSelect.size > 0 ? (
              <>
                <button
                  onClick={handleUndoSelected}
                  disabled={undoingAll}
                  className="h-8 px-3.5 rounded-lg text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {multiSelect.size} ausgewählte zurücksetzen
                </button>
                <button
                  onClick={() => setMultiSelect(new Set())}
                  className="h-8 px-3.5 rounded-lg border border-border-strong text-[12.5px] font-medium text-text-muted transition-colors hover:bg-surface"
                  style={{ background: 'var(--color-bg)' }}
                >
                  Auswahl aufheben
                </button>
              </>
            ) : (
              <button
                onClick={handleUndoAll}
                disabled={undoingAll || undoable.length === 0}
                className="h-8 px-3.5 rounded-lg border border-border-strong text-[12.5px] font-medium transition-colors hover:bg-surface disabled:opacity-40"
                style={{ background: 'var(--color-bg)', color: '#DC2626', borderColor: '#FCA5A5' }}
              >
                Alle {undoable.length} Aktionen rückgängig machen
              </button>
            )}
          </div>
        )}

        {/* History list */}
        <div className="rounded-xl border border-border-strong overflow-hidden" style={{ background: 'var(--color-surface)' }}>
          {history.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-[32px] mb-3">✅</div>
              <div className="text-[14px] font-semibold text-text-primary mb-1">Nichts zu retten</div>
              <div className="text-[13px] text-text-muted">Nestor hat noch keine Dateien verändert.</div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((item: HistoryItem, i) => {
                const isSelected = multiSelect.has(item.id)
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.03, duration: 0.2 }}
                    className="flex items-start gap-3 px-5 py-3.5 transition-colors duration-100"
                    style={{
                      background: isSelected ? 'rgba(37,99,235,0.05)' : item.undone ? 'transparent' : undefined,
                      opacity: item.undone ? 0.55 : 1
                    }}
                  >
                    {/* Checkbox for multi-select */}
                    {!item.undone && (
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className="flex-none mt-[3px] w-4 h-4 rounded border transition-colors"
                        style={{
                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border-strong)',
                          background: isSelected ? 'var(--color-accent)' : 'transparent'
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mt-px">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    )}
                    {item.undone && <div className="flex-none w-4" />}

                    {/* Dot */}
                    <span
                      className="rounded-full flex-none"
                      style={{ width: 8, height: 8, marginTop: 6, background: item.undone ? '#D1D5DB' : (DOT_COLORS[item.type] ?? '#A1A1AA') }}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-[13px] font-medium leading-snug"
                          style={{ color: item.undone ? 'var(--color-text-hint)' : 'var(--color-text-primary)', textDecoration: item.undone ? 'line-through' : 'none' }}
                        >
                          {item.verb}
                        </span>
                        {item.sizeBytes && !item.undone && (
                          <span className="text-[11px] text-text-hint">{formatSize(item.sizeBytes)}</span>
                        )}
                        {item.riskLevel === 'risky' && !item.undone && (
                          <span className="text-[10px] font-semibold px-1.5 py-px rounded-md" style={{ background: '#FEE2E2', color: '#DC2626' }}>Riskant</span>
                        )}
                      </div>
                      <div
                        className="text-[12px] leading-snug mt-px break-words"
                        style={{ color: item.undone ? 'var(--color-text-hint)' : 'var(--color-text-muted)', textDecoration: item.undone ? 'line-through' : 'none' }}
                      >
                        {item.target}
                      </div>
                      {item.reason && !item.undone && (
                        <div className="text-[11.5px] text-text-hint mt-0.5 italic">{item.reason}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-text-hint">{item.time}</span>
                        {!item.undone ? (
                          <button
                            onClick={() => handleUndo(item.id)}
                            className="text-[11px] font-medium inline-flex items-center gap-[3px] transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 8a8 8 0 1 1-1 6" /><path d="M4 4v4h4" />
                            </svg>
                            Rückgängig
                          </button>
                        ) : (
                          <span className="text-[11px] text-text-hint inline-flex items-center gap-[3px]">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Zurückgesetzt
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* OS Trash note */}
        <div
          className="rounded-xl border border-border px-5 py-4 flex items-start gap-3"
          style={{ background: 'var(--color-surface)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" className="flex-none mt-0.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          <div className="text-[12.5px] text-text-muted leading-[1.55]">
            Gelöschte Dateien landen im <strong>Windows-Papierkorb</strong> und können dort vollständig wiederhergestellt werden.
            Nestor löscht nie dauerhaft — es sei denn, du leerst den Papierkorb manuell.
          </div>
        </div>
      </div>
    </div>
  )
}
