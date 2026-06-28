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
    q: 'Wo finde ich meine Dateien?',
    a: 'Klicke auf "Dateien" in der linken Leiste. Den überwachten Ordner kannst du in den Einstellungen ändern.'
  },
  {
    q: 'Was tun wenn die KI nicht antwortet?',
    a: 'Prüfe deine Internetverbindung. Bei lokalem Modus: Stelle sicher, dass Ollama läuft (Einstellungen → KI-Konfiguration → Testen).'
  }
]

export default function HelpButton(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center text-[17px] font-bold no-drag hover:scale-105 active:scale-95 transition-transform"
        style={{ background: 'var(--color-accent)' }}
        aria-label="Hilfe öffnen"
        title="Hilfe & FAQ"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
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
                  setOpen(false)
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
                onClick={() => setOpen(false)}
                className="flex-1 text-[13px] py-2.5 rounded-xl font-medium text-white"
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
