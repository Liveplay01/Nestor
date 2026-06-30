import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import type { AiMode, Theme, SavedAction } from '@shared/types'
import SavedActionDialog from './SavedActionDialog'

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
      style={{ background: value ? 'var(--color-accent)' : 'var(--color-border-strong)' }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200"
        style={{ transform: `translateX(${value ? '18px' : '3px'})` }}
      />
    </button>
  )
}

export default function SettingsPage(): React.JSX.Element {
  const { settings, patchSettings, savedActions, setSavedActions, updateSavedAction, removeSavedAction } = useStore()
  const [workspaces, setWorkspaces] = useState<string[]>([])
  const [version, setVersion] = useState('')
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [apiStatusMsg, setApiStatusMsg] = useState('')
  const [editingAction, setEditingAction] = useState<SavedAction | undefined>(undefined)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [launchAtStartup, setLaunchAtStartup] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [uninstallInfo, setUninstallInfo] = useState<{ nestorFound: boolean; ollamaFound: boolean; isDev: boolean } | null>(null)
  const [uninstallOllama, setUninstallOllama] = useState(false)
  const [uninstallConfirm, setUninstallConfirm] = useState(false)

  useEffect(() => {
    window.nestor.app.getVersion().then(setVersion).catch(() => {})
    window.nestor.app.getStartup().then(setLaunchAtStartup).catch(() => {})
    window.nestor.app.getUninstallInfo().then(setUninstallInfo).catch(() => {})
    window.nestor.actions.getAll().then(setSavedActions).catch(() => {})
  }, [setSavedActions])

  useEffect(() => {
    setWorkspaces(settings?.workspaces ?? [])
  }, [settings?.workspaces])

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

  const addWorkspace = async () => {
    const result = await window.nestor.app.addWorkspace()
    if (result) {
      setWorkspaces(result.workspaces)
      patchSettings({ rootFolder: result.rootFolder, workspaces: result.workspaces })
    }
  }

  const removeWorkspace = async (folderPath: string) => {
    const result = await window.nestor.app.removeWorkspace(folderPath)
    setWorkspaces(result.workspaces)
    patchSettings({ rootFolder: result.rootFolder, workspaces: result.workspaces })
  }

  const exportData = async () => {
    const json = await window.nestor.app.exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nestor-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearData = async () => {
    await window.nestor.app.clearData()
    setClearConfirm(false)
    window.location.reload()
  }

  const runUninstall = async () => {
    await window.nestor.app.uninstall({ uninstallOllama })
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
                  className="h-7 px-3.5 rounded-md text-[12.5px] font-medium transition-all duration-150 flex items-center gap-1.5 btn-ghost"
                   style={
                     settings.aiMode === mode
                       ? { background: 'var(--color-accent)', color: '#fff' }
                       : { color: 'var(--color-text-muted)' }
                   }
                >
                  {mode === 'local' ? 'Lokal (Ollama)' : 'Externe API'}
                  {mode === 'local' && (
                    <span
                      className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded leading-none"
                      style={{
                        background: settings.aiMode === 'local' ? 'rgba(255,255,255,0.25)' : '#DCFCE7',
                        color: settings.aiMode === 'local' ? '#fff' : '#16A34A'
                      }}
                    >
                      Empfohlen
                    </span>
                  )}
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
                  className="h-7 px-3.5 rounded-md text-[12.5px] font-medium transition-all duration-150 btn-ghost"
                   style={
                     settings.theme === t
                       ? { background: 'var(--color-accent)', color: '#fff' }
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

        {/* Keyboard Shortcuts */}
        <Section title="Tastenkürzel">
          <div className="px-5 py-3">
            <p className="text-[12.5px] text-text-hint mb-4">Alle Tastenkürzel in Nestor auf einen Blick.</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-0">
              {([
                ['Navigation', [
                  [['Strg', 'P'], 'Befehlspalette öffnen'],
                  [['Strg', '⇧', 'F'], 'Volltext-Suche'],
                  [['Strg', '1'], 'Zur Übersicht'],
                  [['Strg', '2'], 'Zum Datei-Explorer'],
                  [['Strg', '3'], 'Zum KI-Chat'],
                  [['Strg', '4'], 'Zu Einstellungen'],
                  [['Strg', 'B'], 'Dateibaum ein-/ausblenden'],
                ]],
                ['Chat & Aktionen', [
                  [['Strg', 'N'], 'Neuen Chat starten'],
                  [['Strg', 'Z'], 'Letzte Aktion rückgängig'],
                  [['Enter'], 'Nachricht senden'],
                  [['@'], 'Datei als Kontext einfügen'],
                  [['Esc'], 'Auswahl / Dialog schließen'],
                  [['Strg', 'Klick'], 'Datei zur Stapelauswahl'],
                ]],
              ] as [string, [string[], string][]][]).map(([group, shortcuts]) => (
                <div key={group}>
                  <div className="text-[11px] font-semibold text-text-hint uppercase tracking-wider mb-2.5">{group}</div>
                  <div className="flex flex-col gap-1.5 mb-5">
                    {shortcuts.map(([keys, desc]) => (
                      <div key={desc} className="flex items-center justify-between gap-4">
                        <span className="text-[12.5px] text-text-muted flex-1">{desc}</span>
                        <div className="flex items-center gap-1 flex-none">
                          {keys.map((k, i) => (
                            <React.Fragment key={i}>
                              {i > 0 && <span className="text-[10px] text-text-hint">+</span>}
                              <kbd
                                className="inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-mono font-medium rounded text-text-muted"
                                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', boxShadow: '0 1px 0 var(--color-border-strong)', minWidth: 22, lineHeight: '1.6' }}
                              >
                                {k}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
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

        {/* Workspaces */}
        <Section title="Arbeitsbereiche">
          {workspaces.length === 0 ? (
            <div className="px-5 py-4 text-[13px] text-text-faint">
              Noch kein Arbeitsbereich gespeichert. Füge deinen ersten Ordner hinzu.
            </div>
          ) : (
            workspaces.map(ws => {
              const name = ws.split(/[/\\]/).pop()
              const isActive = ws === settings.rootFolder
              return (
                <Row
                  key={ws}
                  label={name ?? ws}
                  hint={isActive ? `Aktiver Arbeitsbereich · ${ws}` : ws}
                >
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-accent)', color: '#fff' }}
                      >
                        Aktiv
                      </span>
                    )}
                    <button
                      onClick={() => removeWorkspace(ws)}
                      className="h-8 px-3 rounded-lg border border-border-strong text-[12.5px] transition-colors hover:bg-surface"
                      style={{ background: 'var(--color-bg)', color: '#DC2626' }}
                    >
                      Entfernen
                    </button>
                  </div>
                </Row>
              )
            })
          )}
          <div className="px-5 py-3">
            <button
              onClick={addWorkspace}
              disabled={workspaces.length >= 5}
              className="flex items-center gap-2 h-8 px-4 rounded-lg border border-border-strong text-[12.5px] font-medium transition-colors hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-bg)', color: 'var(--color-accent)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {workspaces.length >= 5 ? 'Max. 5 Arbeitsbereiche' : 'Ordner hinzufügen'}
            </button>
          </div>
        </Section>

        {/* Saved Actions */}
        <Section title="Meine Schnellaktionen">
          {savedActions.length === 0 ? (
            <div className="px-5 py-4 text-[13px] text-text-faint">
              Noch keine Schnellaktionen erstellt. Erstelle sie über die Startseite.
            </div>
          ) : (
            savedActions.map(a => (
              <Row key={a.id} label={`${a.icon} ${a.name}`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingAction(a); setShowActionDialog(true) }}
                    className="h-8 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-muted transition-colors hover:bg-surface"
                    style={{ background: 'var(--color-bg)' }}
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={async () => { await window.nestor.actions.delete(a.id); removeSavedAction(a.id) }}
                    className="h-8 px-3 rounded-lg border border-border-strong text-[12.5px] transition-colors hover:bg-surface"
                    style={{ background: 'var(--color-bg)', color: '#DC2626' }}
                  >
                    Löschen
                  </button>
                </div>
              </Row>
            ))
          )}
        </Section>

        {showActionDialog && (
          <SavedActionDialog
            initial={editingAction}
            onSave={async (action) => {
              await window.nestor.actions.update(action)
              updateSavedAction(action)
              setShowActionDialog(false)
              setEditingAction(undefined)
            }}
            onClose={() => { setShowActionDialog(false); setEditingAction(undefined) }}
          />
        )}

        {/* System */}
        <Section title="System">
          <Row
            label="Beim Windows-Start öffnen"
            hint="Nestor startet automatisch, wenn du dich bei Windows anmeldest — auch im Task-Manager unter Autostart sichtbar."
          >
            <Toggle
              value={launchAtStartup}
              onChange={(v) => {
                setLaunchAtStartup(v)
                window.nestor.app.setStartup(v)
              }}
            />
          </Row>
          <Row
            label="Im Tray minimieren"
            hint="Beim Schließen bleibt Nestor im System Tray aktiv — über das Icon in der Taskleiste erreichbar."
          >
            <Toggle
              value={settings.minimizeToTray ?? false}
              onChange={(v) => save({ minimizeToTray: v })}
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

        {/* Uninstall */}
        {uninstallInfo && (
          <Section title="Deinstallieren">
            {uninstallInfo.isDev ? (
              <Row label="Deinstallieren" hint="Nur in einer installierten Version verfügbar">
                <span className="text-[12px] text-text-faint">Dev-Modus</span>
              </Row>
            ) : (
              <>
                {uninstallInfo.ollamaFound && (
                  <Row
                    label="Ollama mitentfernen"
                    hint="Ollama wurde von Nestor installiert und kann zusammen deinstalliert werden"
                  >
                    <Toggle value={uninstallOllama} onChange={setUninstallOllama} />
                  </Row>
                )}
                <Row
                  label="Nestor deinstallieren"
                  hint={
                    uninstallConfirm
                      ? 'Die App wird beendet und der Windows-Installer geöffnet.'
                      : 'Entfernt Nestor vollständig von diesem Computer'
                  }
                >
                  {uninstallConfirm ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={runUninstall}
                        className="h-8 px-4 rounded-lg text-[12.5px] font-medium text-white"
                        style={{ background: '#DC2626' }}
                      >
                        Ja, deinstallieren
                      </button>
                      <button
                        onClick={() => setUninstallConfirm(false)}
                        className="h-8 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-muted"
                        style={{ background: 'var(--color-bg)' }}
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setUninstallConfirm(true)}
                      className="h-8 px-4 rounded-lg border border-border-strong text-[12.5px] font-medium transition-colors hover:bg-surface"
                      style={{ background: 'var(--color-bg)', color: '#DC2626' }}
                    >
                      Deinstallieren
                    </button>
                  )}
                </Row>
              </>
            )}
          </Section>
        )}

        {/* Privacy / DSGVO */}
        <Section title="Datenschutz">
          <Row label="Daten exportieren" hint="Alle Einstellungen und Aktivitäten als JSON-Datei herunterladen">
            <button
              onClick={exportData}
              className="h-8 px-4 rounded-lg border border-border-strong text-[12.5px] font-medium text-text-muted transition-colors hover:bg-surface"
              style={{ background: 'var(--color-bg)' }}
            >
              Exportieren
            </button>
          </Row>
          <Row
            label="Alle Daten löschen"
            hint="Einstellungen, Verlauf und API-Schlüssel werden vollständig entfernt"
          >
            {clearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-faint">Wirklich löschen?</span>
                <button
                  onClick={clearData}
                  className="h-8 px-3 rounded-lg text-[12.5px] font-medium text-white"
                  style={{ background: '#DC2626' }}
                >
                  Ja, löschen
                </button>
                <button
                  onClick={() => setClearConfirm(false)}
                  className="h-8 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-muted"
                  style={{ background: 'var(--color-bg)' }}
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                onClick={() => setClearConfirm(true)}
                className="h-8 px-4 rounded-lg border border-border-strong text-[12.5px] font-medium transition-colors hover:bg-surface"
                style={{ background: 'var(--color-bg)', color: '#DC2626' }}
              >
                Daten löschen
              </button>
            )}
          </Row>
        </Section>

        {/* About */}
        <Section title="Über Nestor">
          <Row label="Version" hint="Nestor Desktop">
            <span className="text-[12.5px] text-text-faint">{version || '—'}</span>
          </Row>
          <Row label="Rechtliches">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.nestor.shell.openExternal('https://nestor.app/impressum')}
                className="text-[12.5px] text-text-muted underline underline-offset-2"
              >
                Impressum
              </button>
              <button
                onClick={() => window.nestor.shell.openExternal('https://nestor.app/datenschutz')}
                className="text-[12.5px] text-text-muted underline underline-offset-2"
              >
                Datenschutz
              </button>
            </div>
          </Row>
        </Section>

      </div>
    </div>
  )
}
