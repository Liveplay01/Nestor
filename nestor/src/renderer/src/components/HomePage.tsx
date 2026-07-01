import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import NestorLogo from './NestorLogo'
import DuplicateFinder from './DuplicateFinder'
import InsightsDashboard from './InsightsDashboard'
import SavedActionDialog from './SavedActionDialog'
import type { NavSection, SavedAction, ProblemFinding } from '@shared/types'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Guten Morgen'
  if (h < 17) return 'Guten Tag'
  return 'Guten Abend'
}

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
    action: 'duplicates' as const
  }
]

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

function SavedActionsSection({ onRun }: { onRun: (prompt: string) => void }): React.JSX.Element {
  const { savedActions, addSavedAction, updateSavedAction, removeSavedAction, setSavedActions } = useStore()
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<SavedAction | undefined>(undefined)
  const [contextMenu, setContextMenu] = useState<{ action: SavedAction; x: number; y: number } | null>(null)

  useEffect(() => {
    window.nestor.actions.getAll().then(setSavedActions)
  }, [setSavedActions])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [contextMenu])

  const handleSave = useCallback(async (action: SavedAction) => {
    if (editing) {
      await window.nestor.actions.update(action)
      updateSavedAction(action)
    } else {
      await window.nestor.actions.save(action)
      addSavedAction(action)
    }
    setShowDialog(false)
    setEditing(undefined)
  }, [editing, addSavedAction, updateSavedAction])

  const handleDelete = useCallback(async (id: string) => {
    await window.nestor.actions.delete(id)
    removeSavedAction(id)
    setContextMenu(null)
  }, [removeSavedAction])

  if (savedActions.length === 0 && !showDialog) {
    return (
      <div>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl border border-dashed border-border-strong text-[13px] text-text-hint transition-colors hover:bg-surface hover:text-text-muted btn-press"
          style={{ background: 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Erste Schnellaktion anlegen
        </button>
        {showDialog && (
          <SavedActionDialog
            onSave={handleSave}
            onClose={() => setShowDialog(false)}
          />
        )}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {savedActions.map(a => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onRun(a.prompt)}
            onContextMenu={e => { e.preventDefault(); setContextMenu({ action: a, x: e.clientX, y: e.clientY }) }}
            className="flex items-center gap-3 p-4 rounded-xl border border-border-strong text-left transition-all duration-150 hover:bg-surface card-hover"
            style={{ background: 'var(--color-bg)' }}
          >
            <span className="text-[20px] flex-none">{a.icon}</span>
            <span className="text-[13.5px] font-medium text-text-secondary truncate">{a.name}</span>
          </motion.button>
        ))}

        {/* Add new button */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => { setEditing(undefined); setShowDialog(true) }}
          className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border text-left transition-all duration-150 hover:bg-surface hover:border-border-strong"
          style={{ background: 'transparent' }}
        >
          <span className="w-8 h-8 rounded-lg border border-dashed border-border flex items-center justify-center flex-none" style={{ background: 'var(--color-surface)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <span className="text-[13px] text-text-hint">Neue Aktion</span>
        </motion.button>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 rounded-xl border border-border-strong shadow-window overflow-hidden py-1"
            style={{ background: 'var(--color-bg)', left: contextMenu.x, top: contextMenu.y, minWidth: 160 }}
          >
            <button
              onClick={() => { setEditing(contextMenu.action); setShowDialog(true); setContextMenu(null) }}
              className="w-full flex items-center gap-2.5 px-4 h-9 text-left text-[13px] text-text-secondary hover:bg-surface transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              Bearbeiten
            </button>
            <div className="h-px mx-3 my-1" style={{ background: 'var(--color-border)' }} />
            <button
              onClick={() => handleDelete(contextMenu.action.id)}
              className="w-full flex items-center gap-2.5 px-4 h-9 text-left text-[13px] text-[#DC2626] hover:bg-surface transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
              Löschen
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showDialog && (
        <SavedActionDialog
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowDialog(false); setEditing(undefined) }}
        />
      )}
    </>
  )
}

export default function HomePage(): React.JSX.Element {
  const { setActiveNav, settings, addToast } = useStore()
  const greeting = useMemo(() => getGreeting(), [])
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [issues, setIssues] = useState<ProblemFinding[]>([])

  const goToChat = useCallback((prompt?: string): void => {
    if (prompt) {
      sessionStorage.setItem('nestor_prefill_prompt', prompt)
      // If Chat is already mounted, notify via event
      window.dispatchEvent(new CustomEvent('nestor:prefill-chat', { detail: { message: prompt } }))
    }
    setActiveNav('chat' as NavSection)
  }, [setActiveNav])

  const handleQuickAction = useCallback((a: typeof QUICK_ACTIONS[0]) => {
    if ('action' in a && a.action === 'duplicates') {
      setShowDuplicates(true)
    } else if ('prompt' in a) {
      goToChat(a.prompt)
    }
  }, [goToChat])

  const handleInsightsChat = useCallback((prompt: string) => {
    setShowInsights(false)
    goToChat(prompt)
  }, [goToChat, setShowInsights])

  useEffect(() => {
    if (!settings?.rootFolder || !settings?.onboardingComplete) return
    const key = 'nestor_storage_insight_shown'
    if (localStorage.getItem(key)) return

    const check = async () => {
      try {
        const folders = await window.nestor.app.getSpecialFolders()
        const insight = await window.nestor.fs.analyzeStorage(settings!.rootFolder, folders.downloads)
        if (!insight) return

        const hints: string[] = []
        if (insight.totalSize > 2 * 1024 * 1024 * 1024) {
          const mb = (insight.totalSize / 1024 / 1024).toFixed(0)
          hints.push(`Dein Ordner ist ${mb} MB groß`)
        }
        if (insight.oldFiles > 0) {
          hints.push(`${insight.oldFiles} Dateien älter als 6 Monate`)
        }
        if (insight.downloadsFileCount > 50) {
          hints.push(`Downloads enthält ${insight.downloadsFileCount} Dateien`)
        }

        if (hints.length > 0) {
          addToast({
            type: 'info',
            duration: 8000,
            message: `${hints[0]}${hints.length > 1 ? ` · ${hints.length - 1} weitere Hinweise` : ''}`
          })
          localStorage.setItem(key, '1')
        }
      } catch {}
    }

    check()
  }, [settings?.rootFolder, settings?.onboardingComplete, addToast])

  useEffect(() => {
    if (!settings?.rootFolder || !settings?.onboardingComplete) return
    window.nestor.fs.detectIssues().then(setIssues).catch(() => {})
  }, [settings?.rootFolder, settings?.onboardingComplete])

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[720px] mx-auto px-10 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center justify-between gap-4 mb-10"
        >
          <div className="flex items-center gap-4">
            <NestorLogo size={36} />
            <div>
              <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">{greeting}</h1>
              <p className="text-[13.5px] text-text-faint mt-0.5">Was möchtest du heute organisieren?</p>
            </div>
          </div>

          {/* Insights badge */}
          {settings?.rootFolder && (
            <button
              onClick={() => setShowInsights(true)}
              className="flex items-center gap-2 h-8 px-3.5 rounded-xl border border-border-strong text-[12.5px] font-medium text-text-muted transition-all hover:bg-surface hover:text-text-primary btn-press flex-none"
              style={{ background: 'var(--color-surface)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Analyse
            </button>
          )}
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
                onClick={() => handleQuickAction(a)}
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

        {/* Proactive issue cards */}
        {issues.length > 0 && (
          <motion.section
            className="mb-10"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            <h2 className="text-[12.5px] font-semibold text-text-hint uppercase tracking-wider mb-3">
              Nestor hat etwas bemerkt
            </h2>
            <div className="flex flex-col gap-2">
              {issues.map((issue) => {
                const ISSUE_PROMPTS: Record<string, string> = {
                  untitled_files: 'Ich habe Dateien mit generischen Namen wie "Unbenannt" oder "untitled". Hilf mir, sie sinnvoll umzubenennen.',
                  old_downloads: 'Mein Downloads-Ordner enthält viele alte Dateien. Hilf mir, ihn aufzuräumen.',
                  likely_duplicate_images: 'Ich habe möglicherweise doppelte Bilder in meinem Ordner. Kannst du mir helfen, Duplikate zu finden?',
                  many_installers: 'Ich habe viele Setup- und Installationsdateien. Hilf mir, alte Installer zu bereinigen.'
                }
                const ISSUE_ICONS: Record<string, string> = {
                  untitled_files: '📝',
                  old_downloads: '📥',
                  likely_duplicate_images: '🖼️',
                  many_installers: '📦'
                }
                return (
                  <button
                    key={issue.type}
                    onClick={() => goToChat(ISSUE_PROMPTS[issue.type] ?? issue.message)}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-border-strong text-left transition-all hover:bg-surface card-hover"
                    style={{ background: 'var(--color-bg)' }}
                  >
                    <span className="text-xl flex-none mt-0.5">{ISSUE_ICONS[issue.type] ?? '⚠️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-text-primary">{issue.message}</div>
                      <div className="text-[11.5px] text-text-hint mt-0.5">Mit KI beheben →</div>
                    </div>
                    <span
                      className="flex-none text-[11px] font-semibold px-2 py-0.5 rounded-full self-start mt-0.5"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-strong)' }}
                    >
                      {issue.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* Saved quick actions */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          <h2 className="text-[12.5px] font-semibold text-text-hint uppercase tracking-wider mb-3">
            Meine Schnellaktionen
          </h2>
          <SavedActionsSection onRun={goToChat} />
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

      {/* Modals */}
      <AnimatePresence>
        {showDuplicates && <DuplicateFinder onClose={() => setShowDuplicates(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showInsights && <InsightsDashboard onClose={() => setShowInsights(false)} onOpenChat={handleInsightsChat} />}
      </AnimatePresence>
    </div>
  )
}
