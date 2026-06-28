import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import type { AiMode, Theme } from '@shared/types'

const ACCENT_PRESETS = [
  '#2563EB', // blue
  '#7C3AED', // violet
  '#059669', // emerald
  '#DC2626', // red
  '#D97706', // amber
  '#EC4899', // pink
]

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="mb-8">
      <h2 className="text-[11.5px] font-semibold text-text-hint uppercase tracking-wider mb-3">{title}</h2>
      <div
        className="rounded-xl border border-border-strong overflow-hidden divide-y divide-border"
        style={{ background: 'var(--color-surface)' }}
      >
        {children}
      </div>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-3.5">
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-text-primary">{label}</div>
        {hint && <div className="text-[12px] text-text-faint mt-0.5">{hint}</div>}
      </div>
      <div className="flex-none">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }): React.JSX.Element {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
      style={{ background: value ? '#2563EB' : 'var(--color-border-strong)' }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200"
        style={{ transform: `translateX(${value ? '18px' : '3px'})` }}
      />
    </button>
  )
}

export default function SettingsPage(): React.JSX.Element {
  const { settings, patchSettings } = useStore()
  const [version, setVersion] = useState('')
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [apiStatusMsg, setApiStatusMsg] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [launchAtStartup, setLaunchAtStartup] = useState(false)

  useEffect(() => {
    window.nestor.app.getVersion().then(setVersion).catch(() => {})
    window.nestor.app.getStartup().then(setLaunchAtStartup).catch(() => {})
  }, [])

  useEffect(() => {
    if (settings?.aiMode === 'local') {
      window.nestor.ollama.models().then(setModels).catch(() => {})
    }
  }, [settings?.aiMode])

  const save = async (patch: Parameters<typeof patchSettings>[0]) => {
    patchSettings(patch)
    await window.nestor.settings.set(patch)
  }

  const checkOllama = async () => {
    setOllamaStatus('checking')
    try {
      const s = await window.nestor.ollama.check()
      setOllamaStatus(s.running && s.hasModel ? 'ok' : 'error')
    } catch {
      setOllamaStatus('error')
    }
  }

  const checkApi = async () => {
    if (!settings?.apiKey || !settings?.apiBaseUrl) return
    setApiStatus('checking')
    setApiStatusMsg('')
    try {
      const result = await window.nestor.ollama.testApi(settings.apiKey, settings.apiBaseUrl)
      setApiStatus(result.ok ? 'ok' : 'error')
      setApiStatusMsg(result.message)
    } catch {
      setApiStatus('error')
      setApiStatusMsg('Keine Verbindung möglich.')
    }
  }

  const selectFolder = async () => {
    const folder = await window.nestor.settings.selectFolder()
    if (folder) save({ rootFolder: folder })
  }

  const folderName = settings?.rootFolder
    ? settings.rootFolder.split(/[/\\]/).pop()
    : 'Nicht ausgewählt'

  if (!settings) return <div className="flex-1" />

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[620px] mx-auto px-10 py-10">

        <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mb-8">Einstellungen</h1>

        {/* AI Configuration */}
        <Section title="KI-Konfiguration">
          <Row label="KI-Modus" hint="Lokale KI oder externe API">
            <div className="flex items-center gap-1.5 rounded-lg border border-border-strong p-1" style={{ background: 'var(--color-bg)' }}>
              {(['local', 'api'] as AiMode[]).map((mode) => (
                <button
                  key={mode ?? 'none'}
                  onClick={() => save({ aiMode: mode })}
                  className="h-7 px-3.5 rounded-md text-[12.5px] font-medium transition-all duration-150"
                  style={
                    settings.aiMode === mode
                      ? { background: '#2563EB', color: '#fff' }
                      : { color: 'var(--color-text-muted)' }
                  }
                >
                  {mode === 'local' ? 'Lokal (Ollama)' : 'Externe API'}
                </button>
              ))}
            </div>
          </Row>

          {settings.aiMode === 'local' && (
            <>
              <Row label="Modell" hint="Ollama-Modell für den Chat">
                <div className="flex items-center gap-2">
                  <select
                    value={settings.model}
                    onChange={(e) => save({ model: e.target.value })}
                    className="h-8 px-3 pr-8 rounded-lg border border-border-strong text-[12.5px] text-text-muted outline-none appearance-none"
                    style={{ background: 'var(--color-bg)' }}
                  >
                    {(models.length > 0 ? models : [settings.model]).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button
                    onClick={checkOllama}
                    className="h-8 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-muted transition-colors hover:bg-surface"
                    style={{ background: 'var(--color-bg)' }}
                  >
                    {ollamaStatus === 'checking' ? (
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                      </svg>
                    ) : ollamaStatus === 'ok' ? (
                      <span style={{ color: '#16A34A' }}>✓ Verbunden</span>
                    ) : ollamaStatus === 'error' ? (
                      <span style={{ color: '#DC2626' }}>✗ Fehler</span>
                    ) : 'Testen'}
                  </button>
                </div>
              </Row>
            </>
          )}

          {settings.aiMode === 'api' && (
            <>
              <Row label="API-Schlüssel">
                <input
                  type="password"
                  value={settings.apiKey ?? ''}
                  onChange={(e) => { save({ apiKey: e.target.value }); setApiStatus('idle') }}
                  placeholder="sk-..."
                  className="h-8 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-primary outline-none w-56"
                  style={{ background: 'var(--color-bg)' }}
                />
              </Row>
              <Row label="Base URL">
                <input
                  type="text"
                  value={settings.apiBaseUrl ?? ''}
                  onChange={(e) => { save({ apiBaseUrl: e.target.value }); setApiStatus('idle') }}
                  placeholder="https://api.openai.com/v1"
                  className="h-8 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-primary outline-none w-56"
                  style={{ background: 'var(--color-bg)' }}
                />
              </Row>
              <Row label="Modell" hint="z. B. gpt-4o">
                <input
                  type="text"
                  value={settings.model}
                  onChange={(e) => save({ model: e.target.value })}
                  placeholder="gpt-4o"
                  className="h-8 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-primary outline-none w-40"
                  style={{ background: 'var(--color-bg)' }}
                />
              </Row>
              <Row label="Verbindung testen" hint={apiStatusMsg || 'Prüft ob API-Key und URL korrekt sind'}>
                <button
                  onClick={checkApi}
                  disabled={!settings.apiKey || !settings.apiBaseUrl || apiStatus === 'checking'}
                  className="h-8 px-4 rounded-lg border border-border-strong text-[12.5px] font-medium transition-colors disabled:opacity-40"
                  style={{ background: 'var(--color-bg)', color: apiStatus === 'ok' ? '#16A34A' : apiStatus === 'error' ? '#DC2626' : 'var(--color-text-muted)' }}
                >
                  {apiStatus === 'checking' ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                      </svg>
                      Prüfe…
                    </span>
                  ) : apiStatus === 'ok' ? '✓ Verbunden' : apiStatus === 'error' ? '✗ Fehler' : 'Testen'}
                </button>
              </Row>
            </>
          )}
        </Section>

        {/* Appearance */}
        <Section title="Erscheinungsbild">
          <Row label="Design" hint="Hell oder dunkel">
            <div className="flex items-center gap-1.5 rounded-lg border border-border-strong p-1" style={{ background: 'var(--color-bg)' }}>
              {(['light', 'dark'] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    save({ theme: t })
                    document.documentElement.setAttribute('data-theme', t)
                  }}
                  className="h-7 px-3.5 rounded-md text-[12.5px] font-medium transition-all duration-150"
                  style={
                    settings.theme === t
                      ? { background: '#2563EB', color: '#fff' }
                      : { color: 'var(--color-text-muted)' }
                  }
                >
                  {t === 'light' ? 'Hell' : 'Dunkel'}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Akzentfarbe">
            <div className="flex items-center gap-2">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => save({ accentColor: c })}
                  className="w-6 h-6 rounded-full transition-all duration-150"
                  style={{
                    background: c,
                    boxShadow: settings.accentColor === c ? `0 0 0 2px var(--color-bg), 0 0 0 4px ${c}` : 'none'
                  }}
                />
              ))}
            </div>
          </Row>
        </Section>

        {/* Language */}
        <Section title="Sprache">
          <Row label="Sprache" hint="Beeinflusst die Benutzeroberfläche">
            <select
              value={settings.language}
              onChange={(e) => save({ language: e.target.value })}
              className="h-8 px-3 pr-8 rounded-lg border border-border-strong text-[12.5px] text-text-muted outline-none appearance-none"
              style={{ background: 'var(--color-bg)' }}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </Row>
        </Section>

        {/* Files & Folders */}
        <Section title="Dateien & Ordner">
          <Row label="Wurzelordner" hint={settings.rootFolder || 'Kein Ordner ausgewählt'}>
            <button
              onClick={selectFolder}
              className="h-8 px-4 rounded-lg border border-border-strong text-[12.5px] font-medium text-text-muted transition-colors hover:bg-surface"
              style={{ background: 'var(--color-bg)' }}
            >
              {folderName} — Ändern
            </button>
          </Row>
          <Row label="Benachrichtigungen" hint="Systembenachrichtigungen bei Dateiaktionen">
            <Toggle
              value={settings.notifications ?? true}
              onChange={(v) => save({ notifications: v })}
            />
          </Row>
        </Section>

        {/* System */}
        <Section title="System">
          <Row
            label="Beim Windows-Start öffnen"
            hint="Nestor startet automatisch, wenn du dich bei Windows anmeldest. Die Einstellung ist auch im Task-Manager unter dem Tab „Autostart" sichtbar."
          >
            <Toggle
              value={launchAtStartup}
              onChange={(v) => {
                setLaunchAtStartup(v)
                window.nestor.app.setStartup(v)
              }}
            />
          </Row>
        </Section>

        {/* Help */}
        <Section title="Hilfe">
          <Row label="App-Tour" hint="Zeigt dir noch einmal alle Bereiche der App">
            <button
              onClick={() => window.dispatchEvent(new Event('nestor:start-tour'))}
              className="h-8 px-4 rounded-lg border border-border-strong text-[12.5px] font-medium text-text-muted transition-colors hover:bg-surface"
              style={{ background: 'var(--color-bg)' }}
            >
              Tour starten
            </button>
          </Row>
        </Section>

        {/* About */}
        <Section title="Über Nestor">
          <Row label="Version" hint="Nestor Desktop">
            <span className="text-[12.5px] text-text-faint">{version || '—'}</span>
          </Row>
        </Section>

      </div>
    </div>
  )
}
