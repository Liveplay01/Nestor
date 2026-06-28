import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { getFileColor } from '../lib/fileColors'
import { ConfirmDialog, PromptDialog } from './Dialog'
import type { FileEntry } from '@shared/types'

// ─── Context Menu ──────────────────────────────────────────────────────────

interface CtxMenu {
  x: number
  y: number
  entry: FileEntry
}

function ContextMenu({ menu, onClose, onAction }: {
  menu: CtxMenu
  onClose: () => void
  onAction: (action: string, entry: FileEntry) => void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const items = menu.entry.isFolder
    ? [
        { label: 'Öffnen', action: 'open' },
        { label: 'Im Explorer anzeigen', action: 'reveal' },
        null,
        { label: 'Neuer Ordner darin', action: 'new-folder' },
        { label: 'Neue Datei darin', action: 'new-file' },
        null,
        { label: 'Umbenennen', action: 'rename' },
        { label: 'Löschen', action: 'delete', danger: true },
      ]
    : [
        { label: 'Öffnen', action: 'open' },
        { label: 'Im Explorer anzeigen', action: 'reveal' },
        null,
        { label: 'Kopieren', action: 'copy' },
        { label: 'Ausschneiden', action: 'cut' },
        null,
        { label: 'Umbenennen', action: 'rename' },
        { label: 'Löschen', action: 'delete', danger: true },
      ]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
      className="fixed z-50 py-1 rounded-lg border border-border-strong shadow-window text-[13px]"
      style={{ top: menu.y, left: menu.x, minWidth: 180, background: 'var(--color-bg)' }}
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={i} className="my-1 h-px border-t border-border" />
        ) : (
          <button
            key={item.action}
            onClick={() => { onAction(item.action, menu.entry); onClose() }}
            className="w-full text-left px-3.5 h-[30px] flex items-center transition-colors duration-100 hover:bg-surface"
            style={{ color: item.danger ? '#DC2626' : 'var(--color-text-muted)' }}
          >
            {item.label}
          </button>
        )
      )}
    </motion.div>
  )
}

// ─── File Icon ─────────────────────────────────────────────────────────────

function FileIcon({ entry }: { entry: FileEntry }): React.JSX.Element {
  if (entry.isFolder) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#CA8A04" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
        <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5v7.5A1.5 1.5 0 0 1 19 18.5H4.5A1.5 1.5 0 0 1 3 17V7.5z" fill="#CA8A0418" />
      </svg>
    )
  }
  const color = getFileColor(entry.name)
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M6.5 3.5h7l4 4v12.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" fill={color + '14'} />
      <path d="M13.5 3.5V8h4" />
    </svg>
  )
}

// ─── Preview Panel ─────────────────────────────────────────────────────────

const IMG_EXTS   = new Set(['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico', '.tiff', '.tif', '.avif'])
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v', '.ogv', '.3gp'])
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.opus', '.wma'])
const TEXT_EXTS  = new Set([
  '.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.css', '.scss', '.sass', '.less',
  '.html', '.xml', '.yaml', '.yml', '.sh', '.bash', '.zsh', '.py', '.go', '.rs', '.toml',
  '.env', '.ini', '.cfg', '.log', '.bat', '.ps1', '.java', '.cpp', '.c', '.h', '.cs',
  '.swift', '.rb', '.php', '.lua', '.vue', '.svelte', '.kt', '.r', '.sql', '.graphql',
  '.proto', '.gitignore', '.editorconfig', '.prettierrc', '.eslintrc',
])
const DOCX_EXTS  = new Set(['.docx'])
const XLSX_EXTS  = new Set(['.xlsx', '.xls', '.ods'])
const CSV_EXTS   = new Set(['.csv'])
const FONT_EXTS  = new Set(['.ttf', '.otf', '.woff', '.woff2'])

function getExt(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? '.' + parts[parts.length - 1].toLowerCase() : ''
}

function toFileUrl(p: string): string {
  const fwd = p.replace(/\\/g, '/')
  return 'file:///' + fwd.replace(/^\//, '')
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const cells: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (ch === ',' && !inQ) { cells.push(cur); cur = '' }
      else cur += ch
    }
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

// ── Shared UI primitives ────────────────────────────────────────────────────

function PreviewLoading(): React.JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center">
      <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    </div>
  )
}

function OpenBtn({ path }: { path: string }): React.JSX.Element {
  return (
    <button
      onClick={() => window.nestor.shell.openPath(path)}
      className="h-8 px-4 rounded-lg text-[12.5px] font-medium transition-colors hover:bg-surface border border-border-strong text-text-muted"
      style={{ background: 'var(--color-bg)' }}
    >
      Mit Standardprogramm öffnen
    </button>
  )
}

// ── Sub-preview components ──────────────────────────────────────────────────

function ImagePreview({ entry }: { entry: FileEntry }): React.JSX.Element {
  return (
    <div className="flex-1 overflow-auto flex items-center justify-center p-6 img-preview-bg">
      <img
        src={toFileUrl(entry.path)}
        alt={entry.name}
        className="max-w-full max-h-full object-contain rounded-lg"
        style={{ maxHeight: 'calc(100vh - 140px)', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}
        draggable={false}
      />
    </div>
  )
}

function VideoPreview({ entry }: { entry: FileEntry }): React.JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <video
        src={toFileUrl(entry.path)}
        controls
        className="max-w-full max-h-full rounded-md"
        style={{ maxHeight: 'calc(100vh - 140px)' }}
      />
    </div>
  )
}

function AudioPreview({ entry }: { entry: FileEntry }): React.JSX.Element {
  const ext = getExt(entry.name).slice(1).toUpperCase()
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)' }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
      </div>
      <div className="text-center">
        <div className="text-[14px] font-semibold text-text-primary leading-snug">{entry.name}</div>
        <div className="text-[11px] text-text-hint uppercase tracking-widest mt-1">{ext}</div>
      </div>
      <audio src={toFileUrl(entry.path)} controls className="w-full max-w-xs" />
    </div>
  )
}

function DocxPreview({ entry }: { entry: FileEntry }): React.JSX.Element {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true); setHtml(null); setError(false)
    window.nestor.fs.previewDocx(entry.path)
      .then(setHtml)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [entry.path])

  if (loading) return <PreviewLoading />
  if (error) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="text-[12.5px] text-text-hint">Dokument konnte nicht geladen werden</div>
      <OpenBtn path={entry.path} />
    </div>
  )
  return (
    <div className="flex-1 overflow-auto py-10 px-8">
      <div className="docx-preview max-w-2xl mx-auto" dangerouslySetInnerHTML={{ __html: html ?? '' }} />
    </div>
  )
}

type XlsxSheet = { name: string; rows: (string | number | boolean | null)[][]; totalRows: number }

function XlsxPreview({ entry }: { entry: FileEntry }): React.JSX.Element {
  const [sheets, setSheets] = useState<XlsxSheet[] | null>(null)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true); setSheets(null); setError(false); setActive(0)
    window.nestor.fs.previewXlsx(entry.path)
      .then(data => setSheets(data as XlsxSheet[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [entry.path])

  if (loading) return <PreviewLoading />
  if (error || !sheets) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="text-[12.5px] text-text-hint">Tabelle konnte nicht geladen werden</div>
      <OpenBtn path={entry.path} />
    </div>
  )

  const sheet = sheets[active]
  const headers = sheet?.rows[0] ?? []
  const dataRows = sheet?.rows.slice(1) ?? []

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {sheets.length > 1 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto flex-none" style={{ background: 'var(--color-surface)' }}>
          {sheets.map((s, i) => (
            <button key={s.name} onClick={() => setActive(i)}
              className="px-3 h-6 rounded text-[11.5px] transition-colors whitespace-nowrap font-medium"
              style={{ background: i === active ? 'var(--color-accent)' : 'transparent', color: i === active ? '#fff' : 'var(--color-text-muted)' }}
            >{s.name}</button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        <table className="border-collapse text-[12px]">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="text-left font-semibold sticky top-0 z-10 whitespace-nowrap"
                  style={{ padding: '4px 12px', borderBottom: '1px solid var(--color-border-strong)', background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                  {String(h ?? '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri} className="hover:bg-surface transition-colors duration-75">
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: '3px 12px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {String(cell ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sheet && sheet.totalRows > 200 && (
          <div className="text-[11px] text-text-hint mt-4 text-center">{sheet.totalRows} Zeilen — zeige erste 200</div>
        )}
      </div>
    </div>
  )
}

function CsvPreview({ entry }: { entry: FileEntry }): React.JSX.Element {
  const [rows, setRows] = useState<string[][] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true); setRows(null)
    window.nestor.fs.readFile(entry.path)
      .then(text => setRows(parseCsv(text.slice(0, 300_000))))
      .catch(() => setRows(null))
      .finally(() => setLoading(false))
  }, [entry.path])

  if (loading) return <PreviewLoading />
  if (!rows || rows.length === 0) return <div className="flex-1 flex items-center justify-center text-[12.5px] text-text-hint">Leere CSV-Datei</div>

  const headers = rows[0]
  const dataRows = rows.slice(1, 1001)
  const total = rows.length - 1

  return (
    <div className="flex-1 overflow-auto p-4">
      <table className="border-collapse text-[12px]">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left font-semibold sticky top-0 z-10 whitespace-nowrap"
                style={{ padding: '4px 12px', borderBottom: '1px solid var(--color-border-strong)', background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => (
            <tr key={ri} className="hover:bg-surface transition-colors duration-75">
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '3px 12px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {total > 1000 && <div className="text-[11px] text-text-hint mt-4 text-center">{total} Zeilen — zeige erste 1000</div>}
    </div>
  )
}

function FontPreview({ entry }: { entry: FileEntry }): React.JSX.Element {
  const fontId = useRef(`nfp-${Math.random().toString(36).slice(2)}`).current
  const url = toFileUrl(entry.path)

  useEffect(() => {
    const style = document.createElement('style')
    style.id = fontId
    style.textContent = `@font-face { font-family: "${fontId}"; src: url("${url}"); }`
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [fontId, url])

  return (
    <div className="flex-1 overflow-auto p-8" style={{ fontFamily: `"${fontId}", serif` }}>
      <div className="text-[11px] uppercase tracking-widest text-text-hint mb-8">{entry.name}</div>
      <div className="space-y-5 text-text-primary">
        <div style={{ fontSize: 56, lineHeight: 1.1 }}>Aa Bb Cc</div>
        <div style={{ fontSize: 34 }}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
        <div style={{ fontSize: 26 }}>abcdefghijklmnopqrstuvwxyz</div>
        <div style={{ fontSize: 20 }} className="text-text-secondary">0 1 2 3 4 5 6 7 8 9</div>
        <div className="border-t border-border pt-6" style={{ fontSize: 17, lineHeight: 1.75 }}>
          The quick brown fox jumps over the lazy dog.
          <br /><span className="text-text-muted">Sphinx of black quartz, judge my vow.</span>
        </div>
      </div>
    </div>
  )
}

function TextPreview({ entry }: { entry: FileEntry }): React.JSX.Element {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true); setContent(null)
    window.nestor.fs.readFile(entry.path)
      .then(setContent)
      .catch(() => setContent(null))
      .finally(() => setLoading(false))
  }, [entry.path])

  if (loading) return <PreviewLoading />
  return (
    <div className="flex-1 overflow-auto p-5">
      <pre className="text-[12.5px] leading-[1.7] text-text-secondary font-mono whitespace-pre-wrap break-words m-0">
        {content ?? 'Inhalt konnte nicht geladen werden'}
      </pre>
    </div>
  )
}

function UnsupportedPreview({ entry }: { entry: FileEntry }): React.JSX.Element {
  const ext = getExt(entry.name).toUpperCase().slice(1)
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)' }}>
        <FileIcon entry={entry} />
      </div>
      <div className="text-center">
        {ext && <div className="text-[11.5px] font-semibold text-text-muted uppercase tracking-wide">{ext}</div>}
        <div className="text-[12.5px] text-text-hint mt-1">Vorschau nicht verfügbar</div>
      </div>
      <OpenBtn path={entry.path} />
    </div>
  )
}

// ── Preview router ──────────────────────────────────────────────────────────

function Preview({ entry }: { entry: FileEntry | null }): React.JSX.Element {
  if (!entry) return (
    <div className="flex-1 flex items-center justify-center text-text-hint text-[13px]">Datei auswählen</div>
  )
  if (entry.isFolder) return (
    <div className="flex-1 flex items-center justify-center text-text-hint text-[13px]">Ordner ausgewählt</div>
  )

  const ext = getExt(entry.name)

  if (IMG_EXTS.has(ext))   return <ImagePreview entry={entry} />
  if (VIDEO_EXTS.has(ext)) return <VideoPreview entry={entry} />
  if (AUDIO_EXTS.has(ext)) return <AudioPreview entry={entry} />
  if (ext === '.pdf')       return <iframe src={toFileUrl(entry.path)} className="flex-1 border-none w-full" style={{ background: 'var(--color-surface)' }} title={entry.name} />
  if (DOCX_EXTS.has(ext))  return <DocxPreview entry={entry} />
  if (XLSX_EXTS.has(ext))  return <XlsxPreview entry={entry} />
  if (CSV_EXTS.has(ext))   return <CsvPreview entry={entry} />
  if (FONT_EXTS.has(ext))  return <FontPreview entry={entry} />
  if (TEXT_EXTS.has(ext))  return <TextPreview entry={entry} />
  return <UnsupportedPreview entry={entry} />
}

// ─── Explorer ──────────────────────────────────────────────────────────────

export default function Explorer(): React.JSX.Element {
  const { settings, addHistoryItem, addToast } = useStore()
  const rootFolder = settings?.rootFolder ?? ''

  type DialogState =
    | { type: 'confirm'; message: string; danger?: boolean; pending: () => Promise<void> }
    | { type: 'prompt'; label: string; pending: (value: string) => Promise<void> }
    | null

  const [entries, setEntries] = useState<FileEntry[]>([])
  const [currentPath, setCurrentPath] = useState(rootFolder)
  const [breadcrumb, setBreadcrumb] = useState<{ name: string; path: string }[]>([])
  const [selected, setSelected] = useState<FileEntry | null>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [clipboard, setClipboard] = useState<{ entry: FileEntry; cut: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)

  const loadEntries = useCallback(async (path: string) => {
    if (!path) return
    setLoading(true)
    try {
      const result = await window.nestor.fs.listDir(path)
      setEntries(result)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setCurrentPath(rootFolder)
    setBreadcrumb([])
  }, [rootFolder])

  useEffect(() => {
    if (currentPath) loadEntries(currentPath)
  }, [currentPath, loadEntries])

  const navigate = (path: string, _name: string) => {
    const root = rootFolder.replace(/\\/g, '/')
    const target = path.replace(/\\/g, '/')
    if (target === root) {
      setBreadcrumb([])
    } else {
      const relative = target.startsWith(root) ? target.slice(root.length) : target
      const parts = relative.split('/').filter(Boolean)
      let acc = root
      const crumbs = parts.map((p) => { acc += '/' + p; return { name: p, path: acc } })
      setBreadcrumb(crumbs)
    }
    setCurrentPath(path)
    setSelected(null)
  }

  const handleContextAction = async (action: string, entry: FileEntry) => {
    if (action === 'open') { window.nestor.shell.openPath(entry.path); return }
    if (action === 'reveal') { window.nestor.shell.showInFolder(entry.path); return }
    if (action === 'copy') { setClipboard({ entry, cut: false }); return }
    if (action === 'cut') { setClipboard({ entry, cut: true }); return }
    if (action === 'rename') { setRenaming(entry.path); setRenameValue(entry.name); return }
    if (action === 'delete') {
      setDialog({
        type: 'confirm',
        message: `"${entry.name}" wirklich in den Papierkorb verschieben?`,
        danger: true,
        pending: async () => {
          const item = await window.nestor.fs.deleteFile(entry.path)
          if (item) addHistoryItem(item)
          loadEntries(currentPath)
          addToast({ type: 'success', message: `✓ "${entry.name}" gelöscht  ·  Strg+Z zum Rückgängigmachen` })
        }
      })
      return
    }
    if (action === 'new-folder') {
      setDialog({
        type: 'prompt',
        label: 'Ordnername:',
        pending: async (name) => {
          const sep = currentPath.includes('/') ? '/' : '\\'
          const newPath = entry.isFolder ? `${entry.path}${sep}${name}` : `${currentPath}${sep}${name}`
          const item = await window.nestor.fs.createFolder(newPath)
          if (item) addHistoryItem(item)
          loadEntries(currentPath)
          addToast({ type: 'success', message: `✓ Ordner "${name}" erstellt` })
        }
      })
      return
    }
    if (action === 'new-file') {
      setDialog({
        type: 'prompt',
        label: 'Dateiname:',
        pending: async (name) => {
          const sep = currentPath.includes('/') ? '/' : '\\'
          const newPath = entry.isFolder ? `${entry.path}${sep}${name}` : `${currentPath}${sep}${name}`
          if (!name.includes('.')) {
            addToast({ type: 'info', message: `Tipp: "${name}" hat keine Dateiendung. Für ein Textdokument z.B. "${name}.txt" verwenden.`, duration: 6000 })
          }
          await window.nestor.fs.createFile(newPath)
          loadEntries(currentPath)
          addToast({ type: 'success', message: `✓ Datei "${name}" erstellt` })
        }
      })
      return
    }
  }

  const submitRename = async () => {
    if (!renaming || !renameValue.trim()) { setRenaming(null); return }
    const newName = renameValue.trim()
    const item = await window.nestor.fs.renameFile(renaming, newName)
    if (item) addHistoryItem(item)
    setRenaming(null)
    loadEntries(currentPath)
    addToast({ type: 'success', message: `✓ Umbenannt in "${newName}"` })
  }

  const handlePaste = async () => {
    if (!clipboard) return
    const sep = currentPath.includes('/') ? '/' : '\\'
    const dest = `${currentPath}${sep}${clipboard.entry.name}`
    let item
    if (clipboard.cut) {
      item = await window.nestor.fs.moveFile(clipboard.entry.path, dest)
      setClipboard(null)
      addToast({ type: 'success', message: `✓ "${clipboard.entry.name}" verschoben` })
    } else {
      item = await window.nestor.fs.copyFile(clipboard.entry.path, dest)
      addToast({ type: 'success', message: `✓ "${clipboard.entry.name}" eingefügt` })
    }
    if (item) addHistoryItem(item)
    loadEntries(currentPath)
  }

  const sortedEntries = [...entries].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1
    return a.name.localeCompare(b.name)
  })

  const rootName = rootFolder.split(/[/\\]/).pop() ?? 'Ordner'

  return (
    <div
      className="flex-1 flex min-w-0 min-h-0"
      onContextMenu={(e) => { if (e.target === e.currentTarget) e.preventDefault() }}
    >
      {/* Left: file list */}
      <div
        className="flex flex-col border-r border-border"
        style={{ width: 280, minWidth: 200, background: 'var(--color-surface)' }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-3 border-b border-border text-[12px] text-text-faint overflow-x-auto" style={{ height: 40, minHeight: 40 }}>
          <button
            onClick={() => navigate(rootFolder, rootName)}
            className="flex-none hover:text-text-primary transition-colors"
          >
            {rootName}
          </button>
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              <span className="flex-none opacity-50">/</span>
              <button
                onClick={() => navigate(crumb.path, crumb.name)}
                className={`flex-none hover:text-text-primary transition-colors ${i === breadcrumb.length - 1 ? 'text-text-muted font-medium' : ''}`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
          <button
            onClick={handlePaste}
            disabled={!clipboard}
            title="Einfügen"
            className="h-7 px-2.5 rounded text-[11.5px] font-medium text-text-muted transition-colors hover:bg-sidebar disabled:opacity-40"
          >
            Einfügen
          </button>
          <div className="flex-1" />
          <button
            onClick={() => loadEntries(currentPath)}
            title="Aktualisieren"
            className="flex items-center justify-center h-7 w-7 rounded hover:bg-sidebar text-text-faint transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 4v6h6" /><path d="M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </button>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="text-[12.5px] text-text-hint text-center py-8">Leer</div>
          ) : (
            sortedEntries.map((entry) => (
              <div
                key={entry.path}
                onClick={() => {
                  setSelected(entry)
                  if (entry.isFolder) navigate(entry.path, entry.name)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setCtxMenu({ x: e.clientX, y: e.clientY, entry })
                }}
                className={`flex items-center gap-2.5 px-3 h-8 cursor-pointer transition-colors duration-100 ${
                  selected?.path === entry.path
                    ? 'bg-accent/[0.08] text-text-primary'
                    : 'text-text-muted hover:bg-sidebar'
                }`}
              >
                <FileIcon entry={entry} />
                {renaming === entry.path ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename()
                      if (e.key === 'Escape') setRenaming(null)
                      e.stopPropagation()
                    }}
                    onBlur={submitRename}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 text-[12.5px] border border-accent rounded px-1 outline-none"
                    style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  />
                ) : (
                  <span className="flex-1 min-w-0 truncate text-[12.5px]">{entry.name}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: preview */}
      <div
        className="flex-1 flex flex-col min-h-0"
        style={{ background: 'var(--color-bg)' }}
      >
        {/* Preview header */}
        {selected && (
          <div className="flex items-center gap-3 px-5 border-b border-border" style={{ height: 40, minHeight: 40 }}>
            <FileIcon entry={selected} />
            <span className="text-[13px] font-medium text-text-primary">{selected.name}</span>
            <div className="flex-1" />
            <button
              onClick={() => window.nestor.shell.openPath(selected.path)}
              className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
            >
              Öffnen
            </button>
          </div>
        )}
        <Preview entry={selected} />
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          menu={ctxMenu}
          onClose={() => setCtxMenu(null)}
          onAction={handleContextAction}
        />
      )}

      {/* Dialogs */}
      {dialog?.type === 'confirm' && (
        <ConfirmDialog
          message={dialog.message}
          danger={dialog.danger}
          confirmLabel={dialog.danger ? 'In Papierkorb' : 'Bestätigen'}
          onConfirm={async () => { setDialog(null); await dialog.pending() }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'prompt' && (
        <PromptDialog
          label={dialog.label}
          onConfirm={async (value) => { setDialog(null); await dialog.pending(value) }}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}
