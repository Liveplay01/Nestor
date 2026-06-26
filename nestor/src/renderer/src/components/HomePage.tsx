import React from 'react'
import { useStore } from '../store/useStore'
import NestorLogo from './NestorLogo'

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

function AppCard({
  icon,
  name,
  description,
  url
}: {
  icon: React.ReactNode
  name: string
  description: string
  url: string
}): React.JSX.Element {
  return (
    <div
      className="flex-1 flex flex-col gap-4 p-5 rounded-xl border border-border-strong"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex items-center justify-center rounded-xl flex-none"
          style={{ width: 44, height: 44, background: 'var(--color-bg)', border: '1px solid var(--color-border-strong)' }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-text-primary mb-0.5">{name}</div>
          <div className="text-[12.5px] text-text-muted leading-[1.55]">{description}</div>
        </div>
      </div>
      <button
        onClick={() => window.nestor.shell.openExternal(url)}
        className="self-start h-8 px-4 rounded-lg text-[12.5px] font-medium transition-all duration-150 hover:opacity-90"
        style={{ background: '#2563EB', color: '#fff' }}
      >
        Herunterladen
      </button>
    </div>
  )
}

export default function HomePage(): React.JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[780px] mx-auto px-10 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <NestorLogo size={36} />
          <div>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">Guten Tag</h1>
            <p className="text-[13.5px] text-text-faint mt-0.5">Was möchtest du heute organisieren?</p>
          </div>
        </div>

        {/* Recently accessed files */}
        <section className="mb-10">
          <h2 className="text-[12.5px] font-semibold text-text-hint uppercase tracking-wider mb-3">
            Zuletzt geöffnet
          </h2>
          <RecentFiles />
        </section>

        {/* Recent activity */}
        <section className="mb-10">
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

        {/* App recommendations */}
        <section>
          <h2 className="text-[12.5px] font-semibold text-text-hint uppercase tracking-wider mb-3">
            Empfohlene Programme
          </h2>
          <div className="flex gap-4">
            <AppCard
              name="PC Manager"
              description="Microsofts offizielles Optimierungs-Tool — bereinigt Cache, überwacht Systemleistung und blockiert unerwünschte Programme."
              url="https://pcmanager.microsoft.com/en-us"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 5.5C3 4.67 3.67 4 4.5 4h15C20.33 4 21 4.67 21 5.5v10c0 .83-.67 1.5-1.5 1.5h-15C3.67 17 3 16.33 3 15.5v-10z" fill="#0078D4" />
                  <path d="M8 20h8M12 17v3" stroke="#0078D4" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M6 10l2.5 2.5L12 8l3.5 4L18 9" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <AppCard
              name="UniGetUI"
              description="Ein grafisches Frontend für Windows-Paketmanager (winget, scoop, choco). Software einfach suchen, installieren und aktualisieren."
              url="https://www.marticliment.com/unigetui/"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V11" />
                </svg>
              }
            />
          </div>
        </section>

      </div>
    </div>
  )
}
