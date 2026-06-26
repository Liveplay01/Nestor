import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import type { AiMode } from '../../../shared/types'
import NestorLogo from './NestorLogo'

const ACCENT = '#2563EB'

interface Progress {
  percent: number
  statusText: string
  speedText?: string
}

type Step =
  | 'check'
  | 'choose-ai-mode'
  | 'api-config'
  | 'install-ollama'
  | 'pull-model'
  | 'choose-folder'
  | 'done'
  | 'error'

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


interface ModeCardProps {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
  pros: string[]
  cons: string[]
}

function ModeCard({ selected, onClick, icon, title, subtitle, pros, cons }: ModeCardProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border transition-all duration-150 p-4 mb-3"
      style={{
        borderColor: selected ? ACCENT : '#EAEAED',
        background: selected ? '#2563EB08' : '#FBFBFC',
        boxShadow: selected ? `0 0 0 2px ${ACCENT}22` : 'none',
        outline: 'none'
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5"
          style={{ width: 34, height: 34, background: selected ? `${ACCENT}14` : '#F0F0F2' }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[14px] font-semibold text-text-primary">{title}</span>
            {selected && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${ACCENT}14`, color: ACCENT }}>Ausgewählt</span>
            )}
          </div>
          <div className="text-[12.5px] text-text-muted mb-3">{subtitle}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {pros.map((p, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <svg className="flex-shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                <span className="text-[11.5px] text-text-muted leading-tight">{p}</span>
              </div>
            ))}
            {cons.map((c, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <svg className="flex-shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9A9AA2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r="0.5" fill="#9A9AA2" /></svg>
                <span className="text-[11.5px] text-text-hint leading-tight">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function Onboarding(): React.JSX.Element {
  const { setSettings, setOnboardingComplete } = useStore()
  const [step, setStep] = useState<Step>('check')
  const [progress, setProgress] = useState<Progress>({ percent: 0, statusText: 'Vorbereitung…' })
  const [errorMsg, setErrorMsg] = useState('')
  const [chosenFolder, setChosenFolder] = useState('')
  const [aiMode, setAiMode] = useState<AiMode>(null)
  const [apiKey, setApiKey] = useState('')
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.openai.com/v1')
  const [apiModel, setApiModel] = useState('gpt-4o-mini')

  useEffect(() => {
    const unStep = window.nestor.onboarding.onStep((s) => {
      if (s === 'install-ollama' || s === 'pull-model' || s === 'choose-folder' || s === 'done') {
        setStep(s as Step)
      }
    })
    const unProgress = window.nestor.onboarding.onProgress((p) => setProgress(p))
    const unError = window.nestor.onboarding.onError((msg) => {
      setErrorMsg(msg)
      setStep('error')
    })

    const init = async (): Promise<void> => {
      const settings = await window.nestor.settings.get()
      if (settings.onboardingComplete && settings.rootFolder && settings.aiMode) {
        setSettings(settings)
        setOnboardingComplete(true)
        return
      }
      // Show AI mode picker first
      setStep('choose-ai-mode')
    }

    init()
    return () => { unStep(); unProgress(); unError() }
  }, [setSettings, setOnboardingComplete])

  const handleModeSelect = async (mode: AiMode): Promise<void> => {
    setAiMode(mode)
    await window.nestor.settings.set({ aiMode: mode })

    if (mode === 'api') {
      setStep('api-config')
    } else if (mode === 'local') {
      setStep('install-ollama')
      window.nestor.onboarding.start()
    } else {
      // Skip — go to folder selection
      setStep('choose-folder')
    }
  }

  const handleApiConfirm = async (): Promise<void> => {
    if (!apiKey.trim()) return
    await window.nestor.settings.set({
      aiMode: 'api',
      apiKey: apiKey.trim(),
      apiBaseUrl: apiBaseUrl.trim(),
      model: apiModel.trim()
    })
    setStep('choose-folder')
  }

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

  const handleFinish = (): void => setOnboardingComplete(true)

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-[460px] mx-6"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <NestorLogo size={44} />
              <span className="text-[21px] font-semibold text-text-primary tracking-tight">Nestor</span>
            </div>
          </div>

          {step === 'check' && (
            <div className="text-center text-[13px] text-text-faint">Wird geprüft…</div>
          )}

          {step === 'choose-ai-mode' && (
            <div>
              <div className="text-[20px] font-semibold text-text-primary mb-1.5 tracking-tight">Wie soll Nestor denken?</div>
              <div className="text-[13.5px] text-text-faint leading-relaxed mb-5">
                Wähle, wie Nestor auf KI-Funktionen zugreift. Du kannst das später in den Einstellungen ändern.
              </div>

              <ModeCard
                selected={aiMode === 'local'}
                onClick={() => setAiMode('local')}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={aiMode === 'local' ? ACCENT : '#52525B'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                }
                title="Lokal (Ollama)"
                subtitle="Nestor denkt vollständig auf deinem Gerät"
                pros={['100 % privat', 'Keine Kosten', 'Funktioniert offline']}
                cons={['~4 GB Download', 'Mind. 8 GB RAM nötig']}
              />

              <ModeCard
                selected={aiMode === 'api'}
                onClick={() => setAiMode('api')}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={aiMode === 'api' ? ACCENT : '#52525B'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54" />
                    <path d="M7 3.34V5a3 3 0 0 0 3 3h0a2 2 0 0 1 2 2v0c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2v0c0-1.1.9-2 2-2h3.17" />
                    <path d="M11 21.95V18a2 2 0 0 0-2-2H4v-1a2 2 0 0 1 2-2h1" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                }
                title="Externe API"
                subtitle="Nestor nutzt OpenAI oder einen kompatiblen Dienst"
                pros={['Kein Download', 'Schnelle Antworten', 'Niedriger RAM-Bedarf']}
                cons={['Kosten pro Anfrage', 'Daten gehen an Cloud']}
              />

              {aiMode ? (
                <button
                  onClick={() => handleModeSelect(aiMode)}
                  className="w-full h-10 rounded-lg text-[14px] font-medium text-white mt-1 transition-opacity hover:opacity-90"
                  style={{ background: ACCENT }}
                >
                  {aiMode === 'local' ? 'Lokale KI einrichten' : 'API konfigurieren'}
                </button>
              ) : null}

              <div className="text-center mt-4">
                <button
                  onClick={() => handleModeSelect(null)}
                  className="text-[12.5px] text-text-hint hover:text-text-muted transition-colors underline underline-offset-2"
                >
                  Überspringen — ich richte das später in den Einstellungen ein
                </button>
              </div>
            </div>
          )}

          {step === 'api-config' && (
            <div>
              <div className="text-[20px] font-semibold text-text-primary mb-1.5 tracking-tight">API konfigurieren</div>
              <div className="text-[13.5px] text-text-faint leading-relaxed mb-5">
                Gib deinen API-Schlüssel ein. OpenAI und kompatible Dienste (z. B. Azure, Mistral) werden unterstützt.
              </div>

              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">API-Schlüssel</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full h-10 px-3 rounded-lg border border-border-strong bg-white text-[13.5px] text-text-primary mb-4 outline-none transition-all"
                style={{
                  boxShadow: apiKey ? `0 0 0 3px ${ACCENT}14` : undefined,
                  borderColor: apiKey ? '#C7D6F8' : undefined
                }}
              />

              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">API Base URL</label>
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full h-10 px-3 rounded-lg border border-border-strong bg-white text-[13.5px] text-text-primary mb-4 outline-none transition-all"
              />

              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Modell</label>
              <input
                type="text"
                value={apiModel}
                onChange={(e) => setApiModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="w-full h-10 px-3 rounded-lg border border-border-strong bg-white text-[13.5px] text-text-primary mb-5 outline-none transition-all"
              />

              <button
                onClick={handleApiConfirm}
                disabled={!apiKey.trim()}
                className="w-full h-10 rounded-lg text-[14px] font-medium text-white transition-opacity disabled:opacity-40"
                style={{ background: ACCENT }}
              >
                Weiter
              </button>
              <div className="text-center mt-3">
                <button
                  onClick={() => setStep('choose-ai-mode')}
                  className="text-[12.5px] text-text-hint hover:text-text-muted transition-colors"
                >
                  ← Zurück
                </button>
              </div>
            </div>
          )}

          {(step === 'install-ollama' || step === 'pull-model') && (
            <div>
              <div className="text-[20px] font-semibold text-text-primary mb-2 tracking-tight">
                {step === 'install-ollama' ? 'KI-Engine wird eingerichtet' : 'Nestor KI wird heruntergeladen'}
              </div>
              <div className="text-[13.5px] text-text-faint leading-relaxed mb-7">
                {step === 'install-ollama'
                  ? 'Wir installieren Ollama – die Engine, die Nestors KI lokal auf deinem PC betreibt. Keine Daten verlassen dein Gerät.'
                  : 'Das Sprachmodell (ca. 3,8 GB) wird einmalig heruntergeladen. Danach läuft alles vollständig offline.'}
              </div>
              <ProgressBar percent={progress.percent} />
              <div className="mt-3 text-[12px] text-text-faint">{progress.statusText}</div>
              {progress.speedText && (
                <div className="mt-0.5 text-[11px] text-text-hint">{progress.speedText}</div>
              )}
            </div>
          )}

          {step === 'choose-folder' && (
            <div>
              <div className="text-[20px] font-semibold text-text-primary mb-2 tracking-tight">Wähle deinen Hauptordner</div>
              <div className="text-[13.5px] text-text-faint leading-relaxed mb-6">
                Nestor braucht einen Ordner, den er beobachten und organisieren darf. Du kannst das später in den Einstellungen ändern.
              </div>
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
          )}

          {step === 'done' && (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: '#16A34A14' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </motion.div>
              <div className="text-[20px] font-semibold text-text-primary mb-2 tracking-tight">Alles bereit!</div>
              <div className="text-[13.5px] text-text-faint leading-relaxed mb-7">
                Nestor ist eingerichtet und bereit. Öffne den Chat und fang an, deine Dateien zu organisieren.
              </div>
              <button
                onClick={handleFinish}
                className="h-10 px-6 rounded-lg text-[14px] font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: ACCENT }}
              >
                Nestor öffnen
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center">
              <div className="text-[18px] font-semibold text-text-primary mb-2">Etwas ist schiefgelaufen</div>
              <div className="text-[13.5px] text-text-faint mb-6 leading-relaxed">{errorMsg}</div>
              <button
                onClick={() => {
                  setStep('choose-ai-mode')
                  setErrorMsg('')
                }}
                className="h-10 px-5 rounded-lg text-[14px] font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: ACCENT }}
              >
                Erneut versuchen
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
