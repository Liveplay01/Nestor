import React from 'react'

interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info)
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-4 px-8"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="text-[32px]">😔</div>
        <h1 className="text-[17px] font-semibold text-text-primary text-center">
          Etwas ist schiefgelaufen
        </h1>
        <p className="text-[13.5px] text-text-faint text-center max-w-xs leading-relaxed">
          Nestor hat einen unerwarteten Fehler gefunden. Bitte starte die App neu.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-5 py-2.5 rounded-xl text-[13.5px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          Neu starten
        </button>
        {this.state.message && (
          <p className="text-[11px] text-text-hint mt-1 font-mono max-w-xs truncate" title={this.state.message}>
            {this.state.message}
          </p>
        )}
      </div>
    )
  }
}
