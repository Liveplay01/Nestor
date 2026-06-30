import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import type { AutomationRule, AutomationTrigger, AutomationActionType } from '@shared/types'

const ACTION_META: Record<AutomationActionType, { icon: string; label: string; description: string }> = {
  move_by_age: {
    icon: '📦',
    label: 'Alte Dateien verschieben',
    description: 'Dateien die älter als N Tage sind, in einen Archiv-Ordner verschieben'
  },
  sort_by_type: {
    icon: '🗂️',
    label: 'Nach Typ sortieren',
    description: 'Dateien automatisch in Unterordner nach Typ sortieren (Bilder, Dokumente, …)'
  },
  delete_empty_folders: {
    icon: '🧹',
    label: 'Leere Ordner löschen',
    description: 'Leere Unterordner im Arbeitsbereich automatisch entfernen'
  }
}

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  on_start: 'Beim Start',
  daily: 'Täglich',
  weekly: 'Wöchentlich'
}

function formatRelTime(ts: number | null): string {
  if (!ts) return 'Noch nie'
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'Gerade eben'
  if (m < 60) return `vor ${m} Min.`
  if (h < 24) return `vor ${h} Std.`
  return `vor ${d} Tag${d !== 1 ? 'en' : ''}`
}

// ── Wizard ────────────────────────────────────────────────────────────────────

interface WizardProps {
  settings: { rootFolder: string } | null
  onSave: (rule: AutomationRule) => void
  onClose: () => void
}

function AutomationWizard({ settings, onSave, onClose }: WizardProps): React.JSX.Element {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [action, setAction] = useState<AutomationActionType | null>(null)
  const [trigger, setTrigger] = useState<AutomationTrigger>('daily')
  const [name, setName] = useState('')
  const [sourceFolder, setSourceFolder] = useState('')
  const [targetFolder, setTargetFolder] = useState('')
  const [ageInDays, setAgeInDays] = useState(30)

  const pickFolder = async (setter: (p: string) => void): Promise<void> => {
    const f = await window.nestor.settings.selectFolder()
    if (f) setter(f)
  }

  const handleSave = (): void => {
    if (!action) return
    const rule: AutomationRule = {
      id: Math.random().toString(36).slice(2),
      name: name || ACTION_META[action].label,
      enabled: true,
      trigger,
      action,
      config: {
        sourceFolder: sourceFolder || settings?.rootFolder || '',
        targetFolder: action === 'move_by_age' ? (targetFolder || '') : undefined,
        ageInDays: action === 'move_by_age' ? ageInDays : undefined
      },
      lastRun: null,
      createdAt: Date.now()
    }
    onSave(rule)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[520px] rounded-2xl shadow-2xl border border-border-strong overflow-hidden"
        style={{ background: 'var(--color-surface)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <div className="text-[15px] font-semibold text-text-primary">Neue Automation</div>
            <div className="text-[12px] text-text-hint mt-0.5">Schritt {step} von 3</div>
          </div>
          <button onClick={onClose} className="text-text-hint hover:text-text-muted p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Step 1: Aktion wählen */}
          {step === 1 && (
            <div>
              <div className="text-[13px] font-semibold text-text-primary mb-3">Welche Aktion soll automatisch ausgeführt werden?</div>
              <div className="flex flex-col gap-2">
                {(Object.keys(ACTION_META) as AutomationActionType[]).map(a => {
                  const meta = ACTION_META[a]
                  const selected = action === a
                  return (
                    <button
                      key={a}
                      onClick={() => setAction(a)}
                      className="flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all"
                      style={{
                        borderColor: selected ? 'var(--color-accent)' : 'var(--color-border-strong)',
                        background: selected ? 'var(--color-accent-faint, rgba(37,99,235,0.06))' : 'var(--color-bg)'
                      }}
                    >
                      <span className="text-xl flex-none mt-0.5">{meta.icon}</span>
                      <div>
                        <div className="text-[13.5px] font-semibold text-text-primary">{meta.label}</div>
                        <div className="text-[12px] text-text-faint mt-0.5">{meta.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Parameter */}
          {step === 2 && action && (
            <div className="flex flex-col gap-4">
              <div className="text-[13px] font-semibold text-text-primary">Name & Konfiguration</div>

              <div>
                <label className="text-[12px] text-text-hint mb-1.5 block">Name (optional)</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={ACTION_META[action].label}
                  className="w-full h-9 px-3 rounded-lg border border-border-strong text-[13px] text-text-primary outline-none"
                  style={{ background: 'var(--color-bg)' }}
                />
              </div>

              <div>
                <label className="text-[12px] text-text-hint mb-1.5 block">Quellordner</label>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-9 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-muted truncate flex items-center"
                    style={{ background: 'var(--color-bg)' }}
                  >
                    {sourceFolder || settings?.rootFolder || 'Arbeitsbereich (Standard)'}
                  </div>
                  <button
                    onClick={() => pickFolder(setSourceFolder)}
                    className="h-9 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-muted hover:bg-surface transition-colors flex-none"
                    style={{ background: 'var(--color-bg)' }}
                  >
                    Wählen
                  </button>
                </div>
              </div>

              {action === 'move_by_age' && (
                <>
                  <div>
                    <label className="text-[12px] text-text-hint mb-1.5 block">Dateien älter als (Tage)</label>
                    <input
                      type="number"
                      value={ageInDays}
                      min={1}
                      max={3650}
                      onChange={e => setAgeInDays(Number(e.target.value))}
                      className="h-9 px-3 rounded-lg border border-border-strong text-[13px] text-text-primary outline-none w-32"
                      style={{ background: 'var(--color-bg)' }}
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-text-hint mb-1.5 block">Zielordner (Archiv)</label>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 h-9 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-muted truncate flex items-center"
                        style={{ background: 'var(--color-bg)' }}
                      >
                        {targetFolder || 'Automatisch: /Archiv/'}
                      </div>
                      <button
                        onClick={() => pickFolder(setTargetFolder)}
                        className="h-9 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-muted hover:bg-surface transition-colors flex-none"
                        style={{ background: 'var(--color-bg)' }}
                      >
                        Wählen
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Zeitplan */}
          {step === 3 && (
            <div>
              <div className="text-[13px] font-semibold text-text-primary mb-3">Wann soll die Automation ausgeführt werden?</div>
              <div className="flex flex-col gap-2">
                {(Object.keys(TRIGGER_LABELS) as AutomationTrigger[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTrigger(t)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all"
                    style={{
                      borderColor: trigger === t ? 'var(--color-accent)' : 'var(--color-border-strong)',
                      background: trigger === t ? 'var(--color-accent-faint, rgba(37,99,235,0.06))' : 'var(--color-bg)'
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-none"
                      style={{ borderColor: trigger === t ? 'var(--color-accent)' : 'var(--color-border-strong)' }}
                    >
                      {trigger === t && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} />}
                    </div>
                    <div>
                      <div className="text-[13.5px] font-semibold text-text-primary">{TRIGGER_LABELS[t]}</div>
                      <div className="text-[12px] text-text-faint mt-0.5">
                        {t === 'on_start' && 'Einmalig bei jedem App-Start'}
                        {t === 'daily' && 'Jeden Tag automatisch ausführen'}
                        {t === 'weekly' && 'Einmal pro Woche ausführen'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <button
            onClick={step === 1 ? onClose : () => setStep(s => (s - 1) as 1 | 2 | 3)}
            className="h-9 px-4 rounded-lg border border-border-strong text-[13px] text-text-muted transition-colors hover:bg-surface"
            style={{ background: 'var(--color-bg)' }}
          >
            {step === 1 ? 'Abbrechen' : 'Zurück'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(s => (s + 1) as 2 | 3)}
              disabled={step === 1 && !action}
              className="h-9 px-5 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--color-accent)' }}
            >
              Weiter
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="h-9 px-5 rounded-lg text-[13px] font-medium text-white"
              style={{ background: 'var(--color-accent)' }}
            >
              Speichern
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AutomationsPage(): React.JSX.Element {
  const { automations, setAutomations, addAutomation, updateAutomation, removeAutomation, settings, addToast } = useStore()
  const [showWizard, setShowWizard] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)

  useEffect(() => {
    window.nestor.automations.getAll().then(setAutomations).catch(() => {})
  }, [setAutomations])

  useEffect(() => {
    return window.nestor.automations.onCompleted(({ id, result }) => {
      updateAutomation({ ...automations.find(a => a.id === id)!, lastResult: result, lastRun: Date.now() })
      addToast({ type: 'success', message: result })
      setRunningId(null)
    })
  }, [automations, updateAutomation, addToast])

  const handleSaveRule = async (rule: AutomationRule): Promise<void> => {
    await window.nestor.automations.save(rule)
    addAutomation(rule)
    setShowWizard(false)
  }

  const handleToggle = async (rule: AutomationRule): Promise<void> => {
    const updated = { ...rule, enabled: !rule.enabled }
    await window.nestor.automations.update(updated)
    updateAutomation(updated)
  }

  const handleDelete = async (id: string): Promise<void> => {
    await window.nestor.automations.delete(id)
    removeAutomation(id)
  }

  const handleRunNow = async (rule: AutomationRule): Promise<void> => {
    setRunningId(rule.id)
    try {
      const res = await window.nestor.automations.runNow(rule.id)
      if (res.ok) {
        const updated = { ...rule, lastRun: Date.now(), lastResult: res.label }
        await window.nestor.automations.update(updated)
        updateAutomation(updated)
        addToast({ type: 'success', message: res.label })
      } else {
        addToast({ type: 'error', message: res.label })
      }
    } catch {
      addToast({ type: 'error', message: 'Fehler beim Ausführen der Automation' })
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      {showWizard && (
        <AutomationWizard
          settings={settings}
          onSave={handleSaveRule}
          onClose={() => setShowWizard(false)}
        />
      )}

      <div className="max-w-[680px] mx-auto px-10 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">Automationen</h1>
            <p className="text-[13px] text-text-hint mt-1">Wiederkehrende Aufgaben automatisch erledigen lassen</p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Neue Automation
          </button>
        </div>

        {automations.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-border-strong flex flex-col items-center justify-center py-16 gap-4"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="text-4xl">⚡</div>
            <div className="text-[15px] font-semibold text-text-primary">Keine Automationen vorhanden</div>
            <div className="text-[13px] text-text-hint text-center max-w-xs">
              Erstelle deine erste Automation und lass Nestor wiederkehrende Aufgaben automatisch erledigen.
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="mt-2 h-9 px-5 rounded-lg text-[13px] font-medium text-white"
              style={{ background: 'var(--color-accent)' }}
            >
              Erste Automation erstellen
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {automations.map(rule => {
              const meta = ACTION_META[rule.action]
              const isRunning = runningId === rule.id
              return (
                <div
                  key={rule.id}
                  className="rounded-xl border border-border-strong p-5 transition-all"
                  style={{ background: 'var(--color-surface)', opacity: rule.enabled ? 1 : 0.6 }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-none"
                      style={{ background: 'var(--color-bg)' }}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] font-semibold text-text-primary truncate">{rule.name}</span>
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-none"
                          style={{ background: 'var(--color-accent)', color: '#fff', opacity: 0.8 }}
                        >
                          {TRIGGER_LABELS[rule.trigger]}
                        </span>
                      </div>
                      <div className="text-[12.5px] text-text-hint">{meta.description}</div>
                      <div className="flex items-center gap-3 mt-2 text-[11.5px] text-text-faint">
                        <span>Letzter Lauf: {formatRelTime(rule.lastRun)}</span>
                        {rule.lastResult && <span>· {rule.lastResult}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-none">
                      <button
                        onClick={() => handleRunNow(rule)}
                        disabled={isRunning}
                        className="h-8 px-3 rounded-lg border border-border-strong text-[12.5px] text-text-muted transition-colors hover:bg-surface disabled:opacity-50 flex items-center gap-1.5"
                        style={{ background: 'var(--color-bg)' }}
                      >
                        {isRunning ? (
                          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                        )}
                        {isRunning ? 'Läuft…' : 'Jetzt'}
                      </button>

                      <button
                        onClick={() => handleToggle(rule)}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
                        style={{ background: rule.enabled ? 'var(--color-accent)' : 'var(--color-border-strong)' }}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200"
                          style={{ transform: `translateX(${rule.enabled ? '18px' : '3px'})` }}
                        />
                      </button>

                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="h-8 w-8 rounded-lg border border-border-strong flex items-center justify-center transition-colors hover:bg-red-500/10"
                        style={{ background: 'var(--color-bg)' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Info box */}
        <div
          className="mt-8 rounded-xl border border-border p-4 flex items-start gap-3"
          style={{ background: 'var(--color-surface)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-hint flex-none mt-0.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          <div className="text-[12.5px] text-text-hint leading-relaxed">
            Automationen werden beim App-Start geprüft und alle 60 Minuten im Hintergrund ausgeführt.
            Mit dem „Jetzt"-Button kannst du eine Automation sofort ausführen.
          </div>
        </div>
      </div>
    </div>
  )
}
