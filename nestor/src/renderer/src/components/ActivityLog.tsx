import React, { useEffect } from 'react'
import { useStore } from '../store/useStore'

const ACCENT = '#2563EB'

const DOT_COLORS: Record<string, string> = {
  create_folder: '#16A34A',
  move_file: '#2563EB',
  rename_file: '#A1A1AA',
  delete_file: '#EF4444'
}

export default function ActivityLog(): React.JSX.Element {
  const { anchors, accessedFiles, history, setHistory, markUndone } = useStore()

  // Load history on mount
  useEffect(() => {
    window.nestor.history.get().then((h) => {
      if (Array.isArray(h)) setHistory(h as Parameters<typeof setHistory>[0])
    })
  }, [setHistory])

  // Listen for history updates from main process
  useEffect(() => {
    const unsub = window.nestor.history.onUpdated((items) => {
      setHistory(items as Parameters<typeof setHistory>[0])
    })
    return unsub
  }, [setHistory])

  const handleUndo = async (id: string) => {
    markUndone(id)
    await window.nestor.fs.undo(id)
  }

  return (
    <div
      className="flex flex-col border-l border-border bg-surface overflow-y-auto"
      style={{ width: 260, minWidth: 260 }}
    >
      {/* ── Anchor Points ─────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-ghost">
          Ankerpunkte
        </span>
        {anchors.length > 0 && (
          <span className="text-[11px] font-semibold text-text-hint bg-[#F0F0F2] rounded-[5px] px-1.5 py-px">
            {anchors.length}
          </span>
        )}
      </div>

      <div className="px-2 pb-1.5">
        {anchors.length === 0 ? (
          <div className="text-[12px] text-text-hint px-2 py-2">
            Noch keine Ankerpunkte. Hover über eine KI-Nachricht.
          </div>
        ) : (
          anchors.map((a) => (
            <div key={a.id} className="flex gap-[9px] items-start p-2 rounded-lg cursor-pointer transition-colors duration-100 hover:bg-black/[0.04]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill={ACCENT} stroke="none" style={{ flex: 'none', marginTop: 1 }}>
                <path d="M6 3.5h12a.5.5 0 0 1 .5.5v16l-6.5-4.3L5.5 20V4a.5.5 0 0 1 .5-.5z" />
              </svg>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium text-text-secondary leading-[1.4]">{a.text}</div>
                <div className="text-[11.5px] text-text-ghost mt-px">{a.time}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="h-px bg-border mx-4 my-1.5" />

      {/* ── Files Accessed ────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-ghost">
          Gelesene Dateien
        </span>
        {accessedFiles.length > 0 && (
          <span className="text-[11px] font-semibold text-text-hint bg-[#F0F0F2] rounded-[5px] px-1.5 py-px">
            {accessedFiles.length}
          </span>
        )}
      </div>

      <div className="px-2 pb-1.5">
        {accessedFiles.length === 0 ? (
          <div className="text-[12px] text-text-hint px-2 py-2">Noch keine Dateien gelesen.</div>
        ) : (
          accessedFiles.map((f) => (
            <div key={f.path} className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors duration-100 hover:bg-black/[0.04]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
                <path d="M6.5 3.5h7l4 4v12.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" />
                <path d="M13.5 3.5V8h4" />
              </svg>
              <span className="text-[12.5px] text-text-muted truncate">{f.name}</span>
            </div>
          ))
        )}
      </div>

      <div className="h-px bg-border mx-4 my-1.5" />

      {/* ── File History ──────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-ghost">
          Verlauf
        </span>
      </div>

      <div className="px-1 pb-4">
        {history.length === 0 ? (
          <div className="text-[12px] text-text-hint px-3 py-2">Noch keine Aktionen.</div>
        ) : (
          history.slice(0, 50).map((item) => (
            <div key={item.id} className="flex gap-2.5 px-3 py-[9px] items-start rounded-lg transition-colors duration-100 hover:bg-black/[0.04]">
              <span
                className="rounded-full flex-none"
                style={{ width: 7, height: 7, marginTop: 5, background: item.undone ? '#A1A1AA' : (DOT_COLORS[item.type] ?? '#A1A1AA') }}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="text-[12.5px] font-medium leading-[1.4]"
                  style={{ color: item.undone ? '#B4B4BA' : '#3F3F46' }}
                >
                  {item.verb}
                </div>
                <div
                  className="text-[12px] leading-[1.4] mt-px break-words"
                  style={{
                    color: item.undone ? '#C4C4CA' : '#71717A',
                    textDecoration: item.undone ? 'line-through' : 'none'
                  }}
                >
                  {item.target}
                </div>
                <div className="flex items-center gap-[9px] mt-1">
                  <span className="text-[11px] text-text-hint">{item.time}</span>
                  {!item.undone ? (
                    <button
                      onClick={() => handleUndo(item.id)}
                      className="text-[11px] font-medium inline-flex items-center gap-[3px] p-0 border-none bg-transparent cursor-pointer hover:underline"
                      style={{ color: ACCENT }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 8a8 8 0 1 1-1 6" /><path d="M4 4v4h4" />
                      </svg>
                      Rückgängig
                    </button>
                  ) : (
                    <span className="text-[11px] text-text-hint inline-flex items-center gap-[3px]">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 8a8 8 0 1 1-1 6" /><path d="M4 4v4h4" />
                      </svg>
                      Zurückgesetzt
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
