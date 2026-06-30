import React, { useEffect } from 'react'
import { Backdrop, DialogBox } from './Dialog'

function formatSize(bytes?: number): string {
  if (!bytes) return '–'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(ms?: number): string {
  if (!ms) return '–'
  return new Date(ms).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export type ConflictResolution = 'keep_existing' | 'rename' | 'skip'

export interface ConflictDialogProps {
  fileName: string
  existing: { sizeBytes?: number; modified?: number }
  onResolve: (resolution: ConflictResolution) => void
  onCancel: () => void
}

export function ConflictDialog({ fileName, existing, onResolve, onCancel }: ConflictDialogProps): React.JSX.Element {
  const [showCompare, setShowCompare] = React.useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <>
      <Backdrop onClick={onCancel} />
      <DialogBox maxWidth={400}>
        <div className="flex items-center gap-2 mb-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-[13.5px] font-semibold text-text-primary">Datei existiert bereits</span>
        </div>
        <p className="text-[13px] text-text-secondary leading-snug mb-3">
          Im Zielordner gibt es schon eine Datei namens <strong>{fileName}</strong>. Was soll Nestor tun?
        </p>

        {showCompare && (
          <div className="mb-3 rounded-lg border border-border p-2.5 text-[12px] text-text-muted" style={{ background: 'var(--color-surface)' }}>
            <div className="flex justify-between"><span>Größe (vorhanden)</span><span>{formatSize(existing.sizeBytes)}</span></div>
            <div className="flex justify-between mt-1"><span>Geändert (vorhanden)</span><span>{formatDate(existing.modified)}</span></div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => onResolve('keep_existing')}
            className="h-9 px-3.5 rounded-lg border border-border-strong text-[12.5px] font-medium text-text-primary text-left transition-colors hover:bg-surface"
            style={{ background: 'var(--color-bg)' }}
          >
            Vorhandene Datei behalten — diese Aktion überspringen
          </button>
          <button
            onClick={() => onResolve('rename')}
            className="h-9 px-3.5 rounded-lg border border-border-strong text-[12.5px] font-medium text-text-primary text-left transition-colors hover:bg-surface"
            style={{ background: 'var(--color-bg)' }}
          >
            Umbenennen und beide behalten
          </button>
          <button
            onClick={() => onResolve('skip')}
            className="h-9 px-3.5 rounded-lg border border-border-strong text-[12.5px] font-medium text-text-primary text-left transition-colors hover:bg-surface"
            style={{ background: 'var(--color-bg)' }}
          >
            Überspringen
          </button>
          {!showCompare && (
            <button
              onClick={() => setShowCompare(true)}
              className="h-9 px-3.5 rounded-lg border border-border-strong text-[12.5px] font-medium text-text-muted text-left transition-colors hover:bg-surface"
              style={{ background: 'var(--color-bg)' }}
            >
              Beide vergleichen (Größe &amp; Datum)
            </button>
          )}
        </div>

        <div className="flex justify-end mt-3.5">
          <button
            onClick={onCancel}
            className="h-8 px-4 rounded-lg text-[12.5px] font-medium text-text-muted transition-colors hover:bg-surface border border-border-strong"
            style={{ background: 'var(--color-bg)' }}
          >
            Abbrechen
          </button>
        </div>
      </DialogBox>
    </>
  )
}
