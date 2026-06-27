import React from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import NestorLogo from './NestorLogo'
import type { NavSection } from '@shared/types'

const ACCENT = 'var(--color-accent)'

const QUICK_ACTIONS = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5V17a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 17V7.5z" />
        <path d="M9 13l2 2 4-4" />
      </svg>
    ),
    label: 'Ordner aufräumen',
    prompt: 'Bitte hilf mir, meinen Ordner aufzuräumen und zu sortieren.'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
      </svg>
    ),
    label: 'Dateien finden',
    prompt: 'Ich suche bestimmte Dateien. Kannst du mir helfen?'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    label: 'Dateien umbenennen',
    prompt: 'Ich möchte Dateien umbenennen. Was soll ich tun?'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    ),
    label: 'Duplikate löschen',
    prompt: 'Ich glaube ich habe doppelte Dateien. Kannst du mir helfen, sie zu finden?'
  }
]

// Stagger container
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } }
}

function RecentFiles(): React.JSX.Element {
  const accessedFiles = useStore((s) => s.accessedFiles)

  if (accessedFiles.length === 0) {
    return <div className="text-[13px] text-text-faint py-4">Noch keine Dateien geöffnet</div>
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

  const handleUndo = async (id: string) => {
    await window.nestor.fs.undo(id)
    markUndone(id)
  }

  if (recent.length === 0) {
    return <div className="text-[13px] text-text-faint py-4">Noch keine Dateiaktionen</div>
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
              onClick={() => handleUndo(item.id)}
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

export default function HomePage(): React.JSX.Element {
  const { setActiveNav } = useStore()

  const goToChat = (prompt?: string): void => {
    if (prompt) sessionStorage.setItem('nestor_prefill_prompt', prompt)
    setActiveNav('chat' as NavSection)
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[720px] mx-auto px-10 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center gap-4 mb-10"
        >
          <NestorLogo size={36} />
          <div>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">Guten Tag</h1>
            <p className="text-[13.5px] text-text-faint mt-0.5">Was möchtest du heute organisieren?</p>
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.section
          className="mb-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 variants={itemVariants} className="text-[12.5px] font-semibold text-text-hint uppercase tracking-wider mb-3">
            Schnellstart
          </motion.h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((a) => (
              <motion.button
                key={a.label}
                variants={itemVariants}
                onClick={() => goToChat(a.prompt)}
                className="flex items-center gap-3 p-4 rounded-xl border border-border-strong text-left transition-all duration-150 hover:bg-surface hover:border-[var(--color-border-strong)] card-hover"
                style={{ background: 'var(--color-bg)' }}
              >
                <span className="flex-none flex items-center justify-center w-8 h-8 rounded-lg border border-border" style={{ background: 'var(--color-surface)' }}>
                  {a.icon}
                </span>
                <span className="text-[13.5px] font-medium text-text-secondary">{a.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Recently accessed files */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          <h2 className="text-[12.5px] font-semibold text-text-hint uppercase tracking-wider mb-3">
            Zuletzt geöffnet
          </h2>
          <RecentFiles />
        </motion.section>

        {/* Recent activity */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
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
        </motion.section>

      </div>
    </div>
  )
}
