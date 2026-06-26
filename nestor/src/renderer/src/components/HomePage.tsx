import React from 'react'
import { useStore } from '../store/useStore'
import NestorLogo from './NestorLogo'
import type { NavSection } from '@shared/types'

function RecentFiles(): React.JSX.Element {
  const accessedFiles = useStore((s) => s.accessedFiles)

  if (accessedFiles.length === 0) {
    return (
      <div className="text-[13px] text-text-faint py-4">
        Noch keine Dateien geöffnet
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
      {accessedFiles.slice(0, 12).map((f) => (
        <button
          key={f.path}
          onClick={() => window.nestor.shell.openPath(f.path)}
          title={f.path}
          className="flex-none flex items-center gap-2 h-9 px-3.5 border border-border-strong rounded-lg text-[12.5px] font-medium text-text-muted transition-all duration-150 hover:bg-surface hover:border-[var(--color-border-strong)]"
          style={{ background: 'var(--color-bg)' }}
        >
          <span className="w-2 h-2 rounded-full flex-none" style={{ background: f.color }} />
          <span className="max-w-[140px] truncate">{f.name}</span>
        </button>
      ))}
    </div>
  )
}

function RecentActivity(): React.JSX.Element {
  const { history, markUndone } = useStore()
  const recent = history.filter((h) => !h.undone).slice(0, 8)

  if (recent.length === 0) {
    return (
      <div className="text-[13px] text-text-faint py-4">
        Noch keine Dateiaktionen
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {recent.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-4 group h-9 px-3.5 rounded-lg transition-colors duration-100 hover:bg-surface">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[13px] font-semibold text-text-primary flex-none">{item.verb}</span>
            <span className="text-[13px] text-text-muted truncate">{item.target}</span>
          </div>
          <div className="flex items-center gap-3 flex-none">
            <span className="text-[11.5px] text-text-hint">{item.time}</span>
            <button
              onClick={() => markUndone(item.id)}
              className="text-[11.5px] text-text-hint opacity-0 group-hover:opacity-100 transition-opacity hover:text-text-muted"
            >
              Rückgängig
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const QUICK_ACTIONS: { icon: string; label: string; prompt: string }[] = [
  { icon: '🗂️', label: 'Ordner aufräumen', prompt: 'Bitte hilf mir, meinen Ordner aufzuräumen und zu sortieren.' },
  { icon: '🔍', label: 'Dateien finden', prompt: 'Ich suche bestimmte Dateien. Kannst du mir helfen?' },
  { icon: '✏️', label: 'Dateien umbenennen', prompt: 'Ich möchte Dateien umbenennen. Was soll ich tun?' },
  { icon: '🗑️', label: 'Duplikate löschen', prompt: 'Ich glaube ich habe doppelte Dateien. Kannst du mir helfen, sie zu finden?' }
]

export default function HomePage(): React.JSX.Element {
  const { setActiveNav } = useStore()

  const goToChat = (prompt?: string): void => {
    if (prompt) {
      sessionStorage.setItem('nestor_prefill_prompt', prompt)
    }
    setActiveNav('chat' as NavSection)
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[720px] mx-auto px-10 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <NestorLogo size={36} />
          <div>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">Guten Tag</h1>
            <p className="text-[13.5px] text-text-faint mt-0.5">Was möchtest du heute organisieren?</p>
          </div>
        </div>

        {/* Quick actions */}
        <section className="mb-10">
          <h2 className="text-[12.5px] font-semibold text-text-hint uppercase tracking-wider mb-3">
            Schnellstart
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => goToChat(a.prompt)}
                className="flex items-center gap-3 p-4 rounded-xl border border-border-strong text-left transition-all duration-150 hover:bg-surface hover:border-[#D9D9DD]"
                style={{ background: 'var(--color-bg)' }}
              >
                <span className="text-[22px] leading-none flex-none">{a.icon}</span>
                <span className="text-[13.5px] font-medium text-text-secondary">{a.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recently accessed files */}
        <section className="mb-10">
          <h2 className="text-[12.5px] font-semibold text-text-hint uppercase tracking-wider mb-3">
            Zuletzt geöffnet
          </h2>
          <RecentFiles />
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="text-[12.5px] font-semibold text-text-hint uppercase tracking-wider mb-3">
            Letzte Aktionen
          </h2>
          <div
            className="rounded-xl border border-border-strong overflow-hidden"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="px-3 py-2">
              <RecentActivity />
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
