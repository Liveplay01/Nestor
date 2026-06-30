import React, { useState, useMemo } from 'react'
import { useStore } from '../store/useStore'
import type { FileEntry } from '@shared/types'

interface Props {
  files: FileEntry[]
  onClose: () => void
  onDone: () => void
}

type Mode = 'prefix-suffix' | 'search-replace' | 'numbering'

const MODE_LABELS: Record<Mode, string> = {
  'prefix-suffix': 'Präfix / Suffix',
  'search-replace': 'Suchen & Ersetzen',
  'numbering': 'Nummerierung'
}

function getBaseName(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

function getExt(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(dot) : ''
}

function computeNewName(file: FileEntry, mode: Mode, opts: {
  prefix: string; suffix: string
  search: string; replace: string; caseSensitive: boolean
  baseName: string; startAt: number; padLength: number; idx: number
}): string {
  const base = getBaseName(file.name)
  const ext = getExt(file.name)

  if (mode === 'prefix-suffix') {
    const newBase = `${opts.prefix}${base}${opts.suffix}`
    return `${newBase}${ext}`
  }

  if (mode === 'search-replace') {
    if (!opts.search) return file.name
    const flags = opts.caseSensitive ? 'g' : 'gi'
    try {
      const regex = new RegExp(opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
      const newBase = base.replace(regex, opts.replace)
      return `${newBase}${ext}`
    } catch {
      return file.name
    }
  }

  if (mode === 'numbering') {
    const n = String(opts.startAt + opts.idx).padStart(opts.padLength, '0')
    return `${opts.baseName}${n}${ext}`
  }

  return file.name
}

export default function BatchRenameModal({ files, onClose, onDone }: Props): React.JSX.Element {
  const { addHistoryItem, addToast } = useStore()
  const [mode, setMode] = useState<Mode>('prefix-suffix')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [search, setSearch] = useState('')
  const [replace, setReplace] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [baseName, setBaseName] = useState('Datei_')
  const [startAt, setStartAt] = useState(1)
  const [padLength, setPadLength] = useState(2)
  const [running, setRunning] = useState(false)

  const previews = useMemo(() => files.map((f, idx) => ({
    file: f,
    newName: computeNewName(f, mode, { prefix, suffix, search, replace, caseSensitive, baseName, startAt, padLength, idx })
  })), [files, mode, prefix, suffix, search, replace, caseSensitive, baseName, startAt, padLength])

  const hasConflicts = useMemo(() => {
    const names = previews.map(p => p.newName.toLowerCase())
    return previews.some((p, i) =>
      p.newName === p.file.name || names.indexOf(p.newName.toLowerCase()) !== i
    )
  }, [previews])

  const noChanges = previews.every(p => p.newName === p.file.name)

  const handleRename = async (): Promise<void> => {
    setRunning(true)
    try {
      const renames = previews
        .filter(p => p.newName !== p.file.name)
        .map(p => ({ from: p.file.path, newName: p.newName }))
      const items = await window.nestor.fs.batchRename(renames)
      for (const item of items) addHistoryItem(item)
      addToast({ type: 'success', message: `✓ ${items.length} Datei${items.length !== 1 ? 'en' : ''} umbenannt` })
      onDone()
      onClose()
    } catch {
      addToast({ type: 'error', message: 'Fehler beim Umbenennen' })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[640px] rounded-2xl shadow-2xl border border-border-strong overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface)', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <div className="text-[15px] font-semibold text-text-primary">Stapelumbenennung</div>
            <div className="text-[12px] text-text-hint mt-0.5">{files.length} Dateien ausgewählt</div>
          </div>
          <button onClick={onClose} className="text-text-hint hover:text-text-muted p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {(Object.keys(MODE_LABELS) as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="h-8 px-3.5 rounded-lg text-[12.5px] font-medium transition-colors"
              style={{
                background: mode === m ? 'var(--color-accent)' : 'var(--color-bg)',
                color: mode === m ? '#fff' : 'var(--color-text-muted)',
                border: mode === m ? 'none' : '1px solid var(--color-border-strong)'
              }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Options */}
        <div className="px-6 py-4 border-b border-border">
          {mode === 'prefix-suffix' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11.5px] text-text-hint mb-1.5 block">Präfix (vor dem Namen)</label>
                <input
                  value={prefix}
                  onChange={e => setPrefix(e.target.value)}
                  placeholder='z.B. "2024_"'
                  className="w-full h-9 px-3 rounded-lg border border-border-strong text-[13px] text-text-primary outline-none"
                  style={{ background: 'var(--color-bg)' }}
                />
              </div>
              <div className="flex-1">
                <label className="text-[11.5px] text-text-hint mb-1.5 block">Suffix (nach dem Namen, vor Endung)</label>
                <input
                  value={suffix}
                  onChange={e => setSuffix(e.target.value)}
                  placeholder='z.B. "_final"'
                  className="w-full h-9 px-3 rounded-lg border border-border-strong text-[13px] text-text-primary outline-none"
                  style={{ background: 'var(--color-bg)' }}
                />
              </div>
            </div>
          )}

          {mode === 'search-replace' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11.5px] text-text-hint mb-1.5 block">Suchen</label>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Text suchen…"
                    className="w-full h-9 px-3 rounded-lg border border-border-strong text-[13px] text-text-primary outline-none"
                    style={{ background: 'var(--color-bg)' }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11.5px] text-text-hint mb-1.5 block">Ersetzen durch</label>
                  <input
                    value={replace}
                    onChange={e => setReplace(e.target.value)}
                    placeholder="Ersatz (leer = löschen)"
                    className="w-full h-9 px-3 rounded-lg border border-border-strong text-[13px] text-text-primary outline-none"
                    style={{ background: 'var(--color-bg)' }}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[12.5px] text-text-muted cursor-pointer">
                <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} className="rounded" />
                Groß-/Kleinschreibung beachten
              </label>
            </div>
          )}

          {mode === 'numbering' && (
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="text-[11.5px] text-text-hint mb-1.5 block">Basisname</label>
                <input
                  value={baseName}
                  onChange={e => setBaseName(e.target.value)}
                  placeholder='z.B. "Urlaub_"'
                  className="w-full h-9 px-3 rounded-lg border border-border-strong text-[13px] text-text-primary outline-none"
                  style={{ background: 'var(--color-bg)' }}
                />
              </div>
              <div className="w-28">
                <label className="text-[11.5px] text-text-hint mb-1.5 block">Startnummer</label>
                <input
                  type="number"
                  value={startAt}
                  min={0}
                  onChange={e => setStartAt(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-border-strong text-[13px] text-text-primary outline-none"
                  style={{ background: 'var(--color-bg)' }}
                />
              </div>
              <div className="w-28">
                <label className="text-[11.5px] text-text-hint mb-1.5 block">Min. Stellen</label>
                <input
                  type="number"
                  value={padLength}
                  min={1}
                  max={6}
                  onChange={e => setPadLength(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-border-strong text-[13px] text-text-primary outline-none"
                  style={{ background: 'var(--color-bg)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Preview table */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid px-6 py-2 text-[11px] font-semibold text-text-hint uppercase tracking-wide border-b border-border" style={{ gridTemplateColumns: '1fr 24px 1fr' }}>
            <span>Vorher</span>
            <span />
            <span>Nachher</span>
          </div>
          {previews.map(({ file, newName }) => {
            const changed = newName !== file.name
            const dup = previews.filter(p => p.newName === newName).length > 1
            return (
              <div
                key={file.path}
                className="grid px-6 py-1.5 border-b border-border text-[12.5px] items-center"
                style={{
                  gridTemplateColumns: '1fr 24px 1fr',
                  background: dup ? 'rgba(220,38,38,0.04)' : 'transparent'
                }}
              >
                <span className="text-text-muted truncate pr-2">{file.name}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={changed ? 'var(--color-accent)' : 'var(--color-border-strong)'} strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span
                  className="truncate pl-2 font-medium"
                  style={{ color: dup ? '#DC2626' : changed ? 'var(--color-text-primary)' : 'var(--color-text-hint)' }}
                >
                  {newName}
                  {dup && <span className="ml-1.5 text-[10px] text-red-500 font-semibold">Konflikt</span>}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <div className="text-[12px] text-text-hint">
            {noChanges ? 'Keine Änderungen' : `${previews.filter(p => p.newName !== p.file.name).length} von ${files.length} werden umbenannt`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border-strong text-[13px] text-text-muted transition-colors hover:bg-surface"
              style={{ background: 'var(--color-bg)' }}
            >
              Abbrechen
            </button>
            <button
              onClick={handleRename}
              disabled={noChanges || hasConflicts || running}
              className="h-9 px-5 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--color-accent)' }}
            >
              {running ? 'Umbenennen…' : 'Umbenennen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
