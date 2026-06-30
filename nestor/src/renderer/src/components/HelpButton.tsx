import React, { useState } from 'react'

const FAQ = [
  {
    q: 'Wie starte ich einen Chat?',
    a: 'Klicke auf "Chat" in der linken Leiste und tippe deine Frage. Nestor antwortet direkt.'
  },
  {
    q: 'Wie mache ich eine Aktion rückgängig?',
    a: 'Drücke Strg+Z – oder öffne den Chat und nutze die "Rückgängig"-Buttons im Aktivitätslog rechts.'
  },
  {
    q: 'Lokal oder externe API – was ist besser?',
    a: 'Lokal läuft alles auf deinem PC – privat & kostenlos, kein Internet nötig. API ist schneller, schickt aber Texte an externe Server.'
  },
  {
    q: 'Wie füge ich Dateien zum Chat hinzu?',
    a: 'Tippe @ im Chat und wähle eine Datei aus dem Baum. Du kannst Dateien auch per Drag & Drop aus dem Explorer in den Chat ziehen.'
  },
  {
    q: 'Wie kopiere ich eine AI-Antwort?',
    a: 'Fahre mit der Maus über die Antwort – oben rechts erscheint ein Kopier-Symbol. Klicke es, um den Text in die Zwischenablage zu kopieren.'
  },
  {
    q: 'Was bedeutet die Analyse?',
    a: 'Auf der Startseite zeigt dir Nestor automatisch Hinweise zu großem/ungenutzten Ordnern. Klicke darauf, um eine detaillierte Analyse im Chat zu erhalten.'
  },
  {
    q: 'Wie verschiebe ich Dateien im Explorer?',
    a: 'Ziehe eine Datei oder einen Ordner auf einen anderen Ordner im Explorer. Der Zielordner wird blau markiert und die Datei wird verschoben.'
  },
  {
    q: 'Wo finde ich meine Dateien?',
    a: 'Klicke auf "Dateien" in der linken Leiste. Den überwachten Ordner kannst du in den Einstellungen ändern.'
  },
  {
    q: 'Was tun wenn die KI nicht antwortet?',
    a: 'Prüfe deine Internetverbindung. Bei lokalem Modus: Stelle sicher, dass Ollama läuft (Einstellungen → KI-Konfiguration → Testen).'
  }
]

export function HelpIcon({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="no-select relative flex flex-col items-center justify-center gap-[3px] rounded-btn btn-press"
      style={{ width: 48, height: 44 }}
      title="Hilfe & FAQ"
    >
      <span
        className="relative z-10 transition-colors duration-150"
        style={{ color: 'var(--color-text-faint)' }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </span>
        <span
          className="relative z-10 text-[11px] font-medium leading-none transition-colors duration-150"
          style={{ color: 'var(--color-text-hint)' }}
        >
          FAQ
        </span>
    </button>
  )
}

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <div
            className="relative rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)' }}
          >
            <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Häufige Fragen
            </h2>
            <div className="space-y-2">
              {FAQ.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <button
                    className="w-full text-left px-4 py-3 text-[13px] font-medium flex justify-between items-center gap-2 transition-colors"
                    style={{ color: 'var(--color-text-primary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-border)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  >
                    <span>{item.q}</span>
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                      {openIdx === i ? '▲' : '▼'}
                    </span>
                  </button>
                  {openIdx === i && (
                    <p
                      className="px-4 pb-3 text-[12.5px] leading-relaxed"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {item.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  onClose()
                  window.dispatchEvent(new Event('nestor:start-tour'))
                }}
                className="flex-1 text-[13px] py-2.5 rounded-xl transition-colors font-medium"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Tour starten
              </button>
              <button
                onClick={onClose}
                className="flex-1 text-[13px] py-2.5 rounded-xl font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-accent)' }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default HelpIcon
