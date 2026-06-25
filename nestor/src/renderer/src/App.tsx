import React, { useEffect } from 'react'
import { useStore } from './store/useStore'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import FileTree from './components/FileTree'
import Chat from './components/Chat'
import ActivityLog from './components/ActivityLog'
import Onboarding from './components/Onboarding'

export default function App(): React.JSX.Element {
  const { onboardingComplete, setSettings } = useStore()

  useEffect(() => {
    window.nestor.settings.get().then((s) => {
      setSettings(s)
    })
  }, [setSettings])

  if (!onboardingComplete) {
    return <Onboarding />
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <FileTree />
        <Chat />
        <ActivityLog />
      </div>
    </div>
  )
}
