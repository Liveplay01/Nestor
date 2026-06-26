import React, { useState } from 'react'

export const TOUR_KEY = 'nestor_tour_v1'

interface Step {
  icon: string
  title: string
  content: string
  panel: 'left' | 'center' | 'right' | 'sidebar' | null
}

const STEPS: Step[] = [
  {
    icon: '👋',
    title: 'Willkommen bei Nestor!',
    content: 'Ich zeige dir kurz die wichtigsten Bereiche – dauert nur 30 Sekunden.',
    panel: null
  },
  {
    icon: '📂',
    title: 'Dateibaum (links)',
    content: 'Hier siehst du alle Dateien in deinem Ordner.\n\nKlicke auf eine Datei um sie zu öffnen – oder ziehe sie per Drag & Drop direkt in den Chat.',
    panel: 'left'
  },
  {
    icon: '💬',
    title: 'Chat mit Nestor (Mitte)',
    content: 'Hier schreibst du mit Nestor. Beschreibe einfach, was du brauchst:\n\n• „Räum meinen Desktop auf"\n• „Finde alle Rechnungen aus 2024"\n• „Benenne diese Datei um"\n\nTippe @ um eine Datei aus dem Baum hinzuzufügen.',
    panel: 'center'
  },
  {
    icon: '↩️',
    title: 'Aktivitätslog (rechts)',
    content: 'Hier siehst du alle Aktionen, die Nestor ausgeführt hat.\n\nWenn etwas schiefläuft, klicke auf „Rückgängig" – Nestor stellt die Datei wieder her.',
    panel: 'right'
  },
  {
    icon: '⚙️',
    title: 'Einstellungen',
    content: 'Ganz links unten findest du die Einstellungen.\n\nDort kannst du KI-Modus, Ordner und Design anpassen – und diese Tour jederzeit erneut starten.',
    panel: 'sidebar'
  }
]

function PanelDiagram({ active }: { active: Step['panel'] }): React.JSX.Element {
  const bg = (on: boolean): React.CSSProperties => ({
    background: on ? '#2563EB' : undefined,
    transition: 'background 0.2s'
  })

  return (
    <div
      className="flex items-stretch gap-1.5 h-12 p-2 rounded-lg mt-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div
        className={`flex-none w-5 rounded flex items-center justify-center text-[9px] border transition-colors ${active === 'sidebar' ? 'text-white border-transparent' : 'border-border text-text-hint'}`}
        style={bg(active === 'sidebar')}
        title="Seitenleiste"
      >
        ⚙
      </div>
      <div
        className={`flex-none w-14 rounded flex items-center justify-center text-[10px] border transition-colors ${active === 'left' ? 'text-white font-semibold border-transparent' : 'border-border text-text-hint'}`}
        style={bg(active === 'left')}
      >
        Dateien
      </div>
      <div
        className={`flex-1 rounded flex items-center justify-center text-[10px] border transition-colors ${(active === 'center' || active === null) ? 'text-white font-semibold border-transparent' : 'border-border text-text-hint'}`}
        style={bg(active === 'center' || active === null)}
      >
        Chat
      </div>
      <div
        className={`flex-none w-16 rounded flex items-center justify-center text-[10px] border transition-colors ${active === 'right' ? 'text-white font-semibold border-transparent' : 'border-border text-text-hint'}`}
        style={bg(active === 'right')}
      >
        Aktivität
      </div>
    </div>
  )
}

interface Props {
  onClose: () => void
}

export default function TourOverlay({ onClose }: Props): React.JSX.Element {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="w-full mx-4 rounded-2xl border border-border-strong shadow-window p-6"
        style={{ maxWidth: 420, background: 'var(--color-bg)' }}
      >
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full"
              style={{
                flex: i === step ? 3 : 1,
                background: i <= step ? '#2563EB' : 'var(--color-border-strong)',
                transition: 'flex 0.3s, background 0.3s'
              }}
            />
          ))}
        </div>

        {/* Icon + Content */}
        <div className="text-[32px] mb-3 leading-none">{current.icon}</div>
        <h2 className="text-[15px] font-semibold text-text-primary mb-2">{current.title}</h2>
        <p className="text-[13.5px] text-text-secondary leading-[1.65] whitespace-pre-line">{current.content}</p>

        <PanelDiagram active={current.panel} />

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={onClose}
            className="text-[12.5px] text-text-hint hover:text-text-muted transition-colors"
          >
            Überspringen
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="h-9 px-4 rounded-lg text-[13px] font-medium text-text-muted border border-border-strong transition-colors hover:bg-surface"
                style={{ background: 'var(--color-bg)' }}
              >
                Zurück
              </button>
            )}
            <button
              onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
              className="h-9 px-5 rounded-lg text-[13px] font-medium text-white transition-colors hover:opacity-90"
              style={{ background: '#2563EB' }}
            >
              {isLast ? 'Fertig! 🎉' : 'Weiter →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
