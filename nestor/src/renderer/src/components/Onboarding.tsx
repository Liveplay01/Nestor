import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'

const ACCENT = '#2563EB'

interface Progress {
  percent: number
  statusText: string
  speedText?: string
}

type Step = 'check' | 'install-ollama' | 'pull-model' | 'choose-folder' | 'done' | 'error'

const STEP_META: Record<string, { title: string; description: string }> = {
  'install-ollama': {
    title: 'KI-Engine wird eingerichtet',
    description: 'Wir installieren Ollama – die Engine, die Nestors KI lokal auf deinem PC betreibt. Keine Daten verlassen dein Gerät.'
  },
  'pull-model': {
    title: 'Nestor KI wird heruntergeladen',
    description: 'Das Sprachmodell (ca. 3,8 GB) wird einmalig heruntergeladen. Danach läuft alles vollständig offline.'
  },
  'choose-folder': {
    title: 'Wähle deinen Hauptordner',
    description: 'Nestor braucht einen Ordner, den er beobachten und organisieren darf. Du kannst das später in den Einstellungen ändern.'
  },
  'done': {
    title: 'Alles bereit!',
    description: 'Nestor ist eingerichtet und bereit. Öffne den Chat und fang an, deine Dateien zu organisieren.'
  }
}

function ProgressBar({ percent }: { percent: number }): React.JSX.Element {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: '#F0F0F2' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: ACCENT }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, percent)}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}

export default function Onboarding(): React.JSX.Element {
  const { setSettings, setOnboardingComplete, patchSettings } = useStore()
  const [step, setStep] = useState<Step>('check')
  const [progress, setProgress] = useState<Progress>({ percent: 0, statusText: 'Vorbereitung…' })
  const [errorMsg, setErrorMsg] = useState('')
  const [chosenFolder, setChosenFolder] = useState('')

  useEffect(() => {
    // Listen for step changes
    const unStep = window.nestor.onboarding.onStep((s) => setStep(s as Step))
    const unProgress = window.nestor.onboarding.onProgress((p) => setProgress(p))
    const unError = window.nestor.onboarding.onError((msg) => {
      setErrorMsg(msg)
      setStep('error')
    })

    // Check current status and decide what to do
    const init = async (): Promise<void> => {
      const settings = await window.nestor.settings.get()
      if (settings.onboardingComplete && settings.rootFolder) {
        setSettings(settings)
        setOnboardingComplete(true)
        return
      }
      // Check if Ollama is already set up
      const status = await window.nestor.ollama.check()
      if (status.running && status.hasModel && settings.rootFolder) {
        // Everything ready
        await window.nestor.settings.set({ onboardingComplete: true })
        setSettings({ ...settings, onboardingComplete: true })
        setOnboardingComplete(true)
        return
      }
      // Start onboarding
      if (status.running && status.hasModel) {
        setStep('choose-folder')
      } else {
        setStep('install-ollama')
        window.nestor.onboarding.start()
      }
    }

    init()
    return () => { unStep(); unProgress(); unError() }
  }, [setSettings, setOnboardingComplete])

  const handleChooseFolder = async (): Promise<void> => {
    const folder = await window.nestor.settings.selectFolder()
    if (folder) setChosenFolder(folder)
  }

  const handleConfirmFolder = async (): Promise<void> => {
    if (!chosenFolder) return
    await window.nestor.settings.set({ rootFolder: chosenFolder, onboardingComplete: true })
    const settings = await window.nestor.settings.get()
    setSettings(settings)
    setStep('done')
  }

  const handleFinish = (): void => {
    setOnboardingComplete(true)
  }

  const meta = STEP_META[step] ?? STEP_META['install-ollama']

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-[420px] mx-6"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 48, height: 48, background: ACCENT }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5v7.5A1.5 1.5 0 0 1 19 18.5H4.5A1.5 1.5 0 0 1 3 17V7.5z" />
              </svg>
            </div>
            <span className="text-[22px] font-semibold text-text-primary tracking-tight">Nestor</span>
          </div>
        </div>

        {step === 'error' ? (
          <div className="text-center">
            <div className="text-[18px] font-semibold text-text-primary mb-2">Etwas ist schiefgelaufen</div>
            <div className="text-[13.5px] text-text-faint mb-6 leading-relaxed">{errorMsg}</div>
            <button
              onClick={() => { setStep('install-ollama'); setErrorMsg(''); window.nestor.onboarding.start() }}
              className="h-10 px-5 rounded-lg text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: ACCENT }}
            >
              Erneut versuchen
            </button>
          </div>
        ) : step === 'done' ? (
          <div className="text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: '#16A34A14' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </motion.div>
            <div className="text-[20px] font-semibold text-text-primary mb-2 tracking-tight">{meta.title}</div>
            <div className="text-[13.5px] text-text-faint leading-relaxed mb-7">{meta.description}</div>
            <button
              onClick={handleFinish}
              className="h-10 px-6 rounded-lg text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: ACCENT }}
            >
              Nestor öffnen
            </button>
          </div>
        ) : step === 'choose-folder' ? (
          <div>
            <div className="text-[20px] font-semibold text-text-primary mb-2 tracking-tight">{meta.title}</div>
            <div className="text-[13.5px] text-text-faint leading-relaxed mb-6">{meta.description}</div>
            <button
              onClick={handleChooseFolder}
              className="w-full h-11 rounded-lg border border-border-strong bg-white text-[14px] font-medium text-text-secondary transition-all duration-150 hover:bg-surface hover:border-[#D9D9DD] mb-3"
            >
              {chosenFolder ? '📁 ' + chosenFolder.split(/[/\\]/).pop() : 'Ordner auswählen…'}
            </button>
            {chosenFolder && (
              <div className="text-[12px] text-text-hint mb-4 truncate px-1">{chosenFolder}</div>
            )}
            <button
              onClick={handleConfirmFolder}
              disabled={!chosenFolder}
              className="w-full h-10 rounded-lg text-[14px] font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: ACCENT }}
            >
              Weiter
            </button>
          </div>
        ) : (
          <div>
            <div className="text-[20px] font-semibold text-text-primary mb-2 tracking-tight">{meta.title}</div>
            <div className="text-[13.5px] text-text-faint leading-relaxed mb-7">{meta.description}</div>
            <ProgressBar percent={progress.percent} />
            <div className="mt-3 text-[12px] text-text-faint">{progress.statusText}</div>
            {progress.speedText && (
              <div className="mt-0.5 text-[11px] text-text-hint">{progress.speedText}</div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
