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

const HomePage = lazy(() => import('./components/HomePage'))
const Explorer = lazy(() => import('./components/Explorer'))
const SettingsPage = lazy(() => import('./components/SettingsPage'))

const panelVariants = {
  visible: { width: 'auto', opacity: 1 },
  hidden: { width: 0, opacity: 0 }
}

export default function App(): React.JSX.Element {
  const { onboardingComplete, setSettings, activeNav, settings, openMarkdownFile, showFileTree, showActivityLog } = useStore()
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    window.nestor.settings.get().then((s) => setSettings(s))
  }, [setSettings])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings?.theme ?? 'light')
  }, [settings?.theme])

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

  const closeTour = (): void => {
    localStorage.setItem(TOUR_KEY, '1')
    setShowTour(false)
  }

  if (!onboardingComplete) return <Onboarding />

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {showTour && <TourOverlay onClose={closeTour} />}
      <TitleBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />
        <Suspense fallback={null}>
          {activeNav === 'home' && <HomePage />}
          {activeNav === 'files' && <Explorer />}
          {activeNav === 'settings' && <SettingsPage />}
        </Suspense>
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
                  style={{ overflow: 'hidden', flexShrink: 0 }}
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
      </div>
    </div>
  )
}
