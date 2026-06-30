import React, { useEffect, lazy, Suspense, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from './store/useStore'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import FileTree from './components/FileTree'
import Chat from './components/Chat'
import ActivityLog from './components/ActivityLog'
import Onboarding from './components/Onboarding'
import MarkdownEditor from './components/MarkdownEditor'
import TourOverlay, { TOUR_KEY } from './components/TourOverlay'
import ToastContainer from './components/Toast'
import CommandPalette from './components/CommandPalette'
import { HelpModal } from './components/HelpButton'
import ErrorBoundary from './components/ErrorBoundary'

const HomePage = lazy(() => import('./components/HomePage'))
const Explorer = lazy(() => import('./components/Explorer'))
const SettingsPage = lazy(() => import('./components/SettingsPage'))
const AutomationsPage = lazy(() => import('./components/AutomationsPage'))
const FullTextSearch = lazy(() => import('./components/FullTextSearch'))

const panelVariants = {
  visible: { width: 'auto', opacity: 1 },
  hidden: { width: 0, opacity: 0 }
}

const pageVariants = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -5 }
}
const pageTransition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] }

export default function App(): React.JSX.Element {
  const { onboardingComplete, setSettings, activeNav, setActiveNav, settings, openMarkdownFile, showFileTree, showActivityLog, setShowFileTree, clearMessages, addToast } = useStore()
  const [showTour, setShowTour] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showFullTextSearch, setShowFullTextSearch] = useState(false)

  useEffect(() => {
    window.nestor.settings.get().then((s) => setSettings(s))
  }, [setSettings])

  useEffect(() => {
    return window.nestor.update.onInstalled((version) => {
      addToast({
        type: 'success',
        message: `Auf Version ${version} aktualisiert — Update-Logs in den Einstellungen`,
        duration: 7000
      })
    })
  }, [addToast])

  // Flush in-memory state to localStorage before Windows shuts down.
  // The main process waits up to 1 s for this before calling app.quit().
  useEffect(() => {
    return window.nestor.lifecycle.onBeforeQuit(() => {
      try {
        const state = useStore.getState()
        if (state.messages.length > 0) {
          localStorage.setItem('nestor_chat_v1', JSON.stringify(state.messages))
        }
      } catch {
        // localStorage write errors are non-fatal during shutdown
      }
    })
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.classList.add('theme-transitioning')
    html.setAttribute('data-theme', settings?.theme ?? 'light')
    const t = setTimeout(() => html.classList.remove('theme-transitioning'), 220)
    return () => clearTimeout(t)
  }, [settings?.theme])

  useEffect(() => {
    const accent = settings?.accentColor ?? '#2563EB'
    document.documentElement.style.setProperty('--color-accent', accent)
  }, [settings?.accentColor])

  // Show tour on first launch (after a short delay so the layout renders first)
  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setShowTour(true), 900)
      return () => clearTimeout(t)
    }
  }, [])

  // Allow SettingsPage to trigger the tour via custom event
  useEffect(() => {
    const handler = (): void => setShowTour(true)
    window.addEventListener('nestor:start-tour', handler)
    return () => window.removeEventListener('nestor:start-tour', handler)
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); setShowPalette((v) => !v) }
      else if ((e.key === 'f' || e.key === 'F') && e.shiftKey) { e.preventDefault(); setShowFullTextSearch((v) => !v) }
      else if (e.key === '1') { e.preventDefault(); setActiveNav('home') }
      else if (e.key === '2') { e.preventDefault(); setActiveNav('files') }
      else if (e.key === '3') { e.preventDefault(); setActiveNav('chat') }
      else if (e.key === '4') { e.preventDefault(); setActiveNav('settings') }
      else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); setShowFileTree(!useStore.getState().showFileTree) }
      else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        clearMessages()
        localStorage.removeItem('nestor_chat_v1')
        setActiveNav('chat')
      }
      else if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault()
        const history = useStore.getState().history
        const latest = history.find(h => !h.undone)
        if (latest) {
          window.nestor.fs.undo(latest.id)
            .then(() => {
              useStore.getState().markUndone(latest.id)
              useStore.getState().addToast({
                type: 'success',
                message: `Rückgängig: ${latest.verb} – "${latest.target}"`
              })
            })
            .catch(() => {
              useStore.getState().addToast({ type: 'error', message: 'Aktion konnte nicht rückgängig gemacht werden.' })
            })
        } else {
          useStore.getState().addToast({ type: 'info', message: 'Nichts zum Rückgängigmachen.' })
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setActiveNav, setShowFileTree, clearMessages])

  const closeTour = (): void => {
    localStorage.setItem(TOUR_KEY, '1')
    setShowTour(false)
  }

  if (!onboardingComplete) return <ErrorBoundary><Onboarding /></ErrorBoundary>

  return (
    <ErrorBoundary>
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {showTour && <TourOverlay onClose={closeTour} />}
      <ToastContainer />
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
      <CommandPalette open={showPalette} onClose={() => setShowPalette(false)} />
      {showFullTextSearch && (
        <Suspense fallback={null}>
          <FullTextSearch onClose={() => setShowFullTextSearch(false)} />
        </Suspense>
      )}
      <TitleBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar onHelpClick={() => setShowHelp(true)} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeNav}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="flex flex-1 min-h-0 min-w-0 overflow-hidden"
          >
            {activeNav === 'home' && (
              <Suspense fallback={null}><HomePage /></Suspense>
            )}
            {activeNav === 'files' && (
              <Suspense fallback={null}><Explorer /></Suspense>
            )}
            {activeNav === 'settings' && (
              <Suspense fallback={null}><SettingsPage /></Suspense>
            )}
            {activeNav === 'automations' && (
              <Suspense fallback={null}><AutomationsPage /></Suspense>
            )}
            {activeNav === 'chat' && (
              <>
                <AnimatePresence initial={false}>
                  {showFileTree && (
                    <motion.div
                      key="filetree"
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={panelVariants}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: 'hidden', flexShrink: 0, display: 'flex', alignSelf: 'stretch' }}
                    >
                      <FileTree />
                    </motion.div>
                  )}
                </AnimatePresence>

                {openMarkdownFile && <MarkdownEditor />}
                <Chat />

                <AnimatePresence initial={false}>
                  {showActivityLog && !openMarkdownFile && (
                    <motion.div
                      key="activitylog"
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={panelVariants}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: 'hidden', flexShrink: 0 }}
                    >
                      <ActivityLog />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
    </ErrorBoundary>
  )
}
