import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { getFileColor } from '../lib/fileColors'
import { ConfirmDialog, PromptDialog } from './Dialog'
import BatchRenameModal from './BatchRenameModal'
import type { FileEntry } from '@shared/types'

const TAG_COLORS = ['#2563EB', '#16A34A', '#CA8A04', '#DC2626', '#7C3AED', '#0891B2']
function tagColor(tag: string): string {
  let h = 0; for (let i = 0; i < tag.length; i++) h = ((h << 5) - h + tag.charCodeAt(i)) | 0
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length]
}

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
      className="h-8 px-4 rounded-lg text-[12.5px] font-medium transition-all duration-150 btn-ghost border border-border-strong text-text-muted"
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
  const { settings, addHistoryItem, addToast, selectedFiles, toggleFileSelection, clearFileSelection, fileTags, setFileTags, setTagsForFile, fileTree } = useStore()
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
  const [hasMore, setHasMore] = useState(false)
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)
  const [showBatchRename, setShowBatchRename] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [activeTagFile, setActiveTagFile] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showExportMenu) return
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu])

  useEffect(() => {
    window.nestor.tags.getAll().then(setFileTags).catch(() => {})
    window.nestor.tags.getAllNames().then(setTagSuggestions).catch(() => {})
  }, [setFileTags])

  const loadEntries = useCallback(async (path: string) => {
    if (!path) return
    setLoading(true)
    setHasMore(false)
    try {
      const result = await window.nestor.fs.listDir(path, 200, 0)
      setEntries(result)
      setHasMore(result.length === 200)
    } catch {
      setEntries([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = async () => {
    if (!currentPath) return
    setLoading(true)
    try {
      const result = await window.nestor.fs.listDir(currentPath, 200, entries.length)
      setEntries(prev => [...prev, ...result])
      setHasMore(result.length === 200)
    } catch {
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setCurrentPath(rootFolder)
    setBreadcrumb([])
    clearFileSelection()
  }, [rootFolder, clearFileSelection])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { clearFileSelection(); setActiveTagFile(null) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clearFileSelection])

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

  const sortedEntries = [...entries]
    .sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      return a.name.localeCompare(b.name)
    })
    .filter(e => {
      if (!tagFilter) return true
      return (fileTags[e.path] ?? []).includes(tagFilter)
    })

  const handleDragStart = (e: React.DragEvent, entry: FileEntry) => {
    e.dataTransfer.setData('nestor/file', JSON.stringify({ name: entry.name, path: entry.path, color: getFileColor(entry.name) }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, entry: FileEntry) => {
    e.preventDefault()
    e.stopPropagation()
    if (entry.isFolder) {
      setDragOverPath(entry.path)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null
    if (!related || !e.currentTarget.contains(related)) {
      setDragOverPath(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetEntry: FileEntry) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPath(null)

    if (!targetEntry.isFolder) return

    const data = e.dataTransfer.getData('nestor/file')
    if (!data) return

    try {
      const file = JSON.parse(data) as { name: string; path: string; color: string }
      if (file.path === targetEntry.path) return
      const dest = `${targetEntry.path}/${file.name}`
      if (file.path === dest) return
      const item = await window.nestor.fs.moveFile(file.path, dest)
      if (item) addHistoryItem(item)
      loadEntries(currentPath)
      addToast({ type: 'success', message: `"${file.name}" verschoben` })
    } catch {
      addToast({ type: 'error', message: 'Verschieben fehlgeschlagen' })
    }
  }

  const addTagToFile = async (filePath: string, tag: string): Promise<void> => {
    const trimmed = tag.trim().toLowerCase()
    if (!trimmed) return
    const current = fileTags[filePath] ?? []
    if (current.includes(trimmed)) return
    const updated = [...current, trimmed]
    await window.nestor.tags.setFileTags(filePath, updated)
    setTagsForFile(filePath, updated)
    if (!tagSuggestions.includes(trimmed)) setTagSuggestions(prev => [...prev, trimmed].sort())
  }

  const removeTagFromFile = async (filePath: string, tag: string): Promise<void> => {
    const current = fileTags[filePath] ?? []
    const updated = current.filter(t => t !== tag)
    await window.nestor.tags.setFileTags(filePath, updated)
    setTagsForFile(filePath, updated)
  }

  const allTagNames = [...new Set(Object.values(fileTags).flat())].sort()

  const rootName = rootFolder.split(/[/\\]/).pop() ?? 'Ordner'

  function buildTextTree(items: FileEntry[], indent = ''): string {
    return items.map((e, i) => {
      const last = i === items.length - 1
      const pre = last ? '└── ' : '├── '
      const childIndent = indent + (last ? '    ' : '│   ')
      const line = `${indent}${pre}${e.name}${e.isFolder ? '/' : ''}`
      return e.isFolder && e.children ? line + '\n' + buildTextTree(e.children, childIndent) : line
    }).join('\n')
  }

  function flatFiles(items: FileEntry[], out: FileEntry[] = []): FileEntry[] {
    for (const e of items) {
      if (!e.isFolder) out.push(e)
      if (e.children) flatFiles(e.children, out)
    }
    return out
  }

  function countTree(items: FileEntry[]): { files: number; folders: number } {
    let files = 0, folders = 0
    for (const e of items) {
      if (e.isFolder) { folders++; if (e.children) { const c = countTree(e.children); files += c.files; folders += c.folders } }
      else files++
    }
    return { files, folders }
  }

  const doExport = async (format: 'txt' | 'csv' | 'html') => {
    setShowExportMenu(false)
    const name = rootName
    let content = '', defaultName = '', filters: { name: string; extensions: string[] }[] = []

    if (format === 'txt') {
      content = `${name}/\n${buildTextTree(fileTree)}`
      defaultName = `${name}_Struktur.txt`
      filters = [{ name: 'Textdatei', extensions: ['txt'] }]
    } else if (format === 'csv') {
      const rows = ['Name,Pfad,Typ,Tags']
      for (const f of flatFiles(fileTree)) {
        const tags = (fileTags[f.path] ?? []).join('; ')
        rows.push(`"${f.name.replace(/"/g,'""')}","${f.path.replace(/"/g,'""')}","${f.type}","${tags}"`)
      }
      content = rows.join('\n')
      defaultName = `${name}_Dateiliste.csv`
      filters = [{ name: 'CSV-Datei', extensions: ['csv'] }]
    } else {
      const all = flatFiles(fileTree)
      const { files: fc, folders: fld } = countTree(fileTree)
      const allTags = [...new Set(all.flatMap(f => fileTags[f.path] ?? []))]
      const tagCloud = allTags.map(t => `<span style="display:inline-block;margin:2px;padding:3px 8px;background:#EEF2FF;color:#3730A3;border-radius:12px;font-size:12px">${t}</span>`).join('')
      const rows = all.slice(0, 500).map(f => {
        const tags = (fileTags[f.path] ?? []).join(', ')
        return `<tr><td>${f.name}</td><td style="color:#6B7280;font-size:12px">${f.path}</td><td>${tags}</td></tr>`
      }).join('\n')
      content = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${name} – Nestor Bericht</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:32px;background:#F9FAFB;color:#111827}h1{font-size:22px;font-weight:700;margin-bottom:4px}.sub{color:#6B7280;margin-bottom:24px;font-size:14px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px}.stat{background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:14px 18px}.stat-n{font-size:24px;font-weight:700;color:#2563EB}.stat-l{font-size:12px;color:#6B7280;margin-top:2px}h2{font-size:15px;font-weight:600;margin:24px 0 10px}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden}th{background:#F3F4F6;text-align:left;padding:8px 12px;font-size:12px;color:#6B7280;font-weight:600}td{padding:7px 12px;font-size:13px;border-top:1px solid #F3F4F6}tr:hover td{background:#F9FAFB}.footer{margin-top:32px;font-size:11px;color:#9CA3AF}</style></head>
<body><h1>${name}</h1><div class="sub">Nestor Bericht · ${new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'})}</div>
<div class="stats"><div class="stat"><div class="stat-n">${fc}</div><div class="stat-l">Dateien</div></div><div class="stat"><div class="stat-n">${fld}</div><div class="stat-l">Ordner</div></div><div class="stat"><div class="stat-n">${allTags.length}</div><div class="stat-l">Tags</div></div></div>
${allTags.length > 0 ? `<h2>Tags</h2><div style="margin-bottom:24px">${tagCloud}</div>` : ''}
<h2>Dateien (${all.length > 500 ? 'erste 500 von ' + all.length : all.length})</h2>
<table><tr><th>Name</th><th>Pfad</th><th>Tags</th></tr>${rows}</table>
<div class="footer">Erstellt mit Nestor · ${new Date().toLocaleString('de-DE')}</div></body></html>`
      defaultName = `${name}_Bericht.html`
      filters = [{ name: 'HTML-Datei', extensions: ['html'] }]
    }

    const result = await window.nestor.app.saveExport(content, defaultName, filters)
    if (result) addToast({ type: 'success', message: `Exportiert: ${defaultName}` })
  }

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
          {selectedFiles.size > 0 ? (
            <>
              <span className="text-[11.5px] text-text-hint">{selectedFiles.size} ausgewählt</span>
              <button
                onClick={() => setShowBatchRename(true)}
                className="h-7 px-2.5 rounded text-[11.5px] font-medium transition-all duration-150"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                Stapelumbenennen
              </button>
              <button
                onClick={clearFileSelection}
                className="h-7 px-2 rounded text-[11.5px] text-text-muted btn-ghost"
              >
                Auswahl aufheben
              </button>
            </>
          ) : (
            <button
              onClick={handlePaste}
              disabled={!clipboard}
              title="Einfügen"
              className="h-7 px-2.5 rounded text-[11.5px] font-medium text-text-muted transition-all duration-150 btn-ghost disabled:opacity-40"
            >
              Einfügen
            </button>
          )}
          <div className="flex-1" />
          {/* Tag-Filter */}
          {allTagNames.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowTagFilter(v => !v)}
                title="Nach Tag filtern"
                className="flex items-center gap-1 h-7 px-2 rounded text-[11.5px] btn-ghost transition-colors"
                style={{ color: tagFilter ? 'var(--color-accent)' : 'var(--color-text-faint)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                {tagFilter ? tagFilter : ''}
              </button>
              {showTagFilter && (
                <div
                  className="absolute right-0 top-8 z-50 rounded-lg border border-border-strong shadow-window py-1 min-w-[140px]"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <button
                    onClick={() => { setTagFilter(null); setShowTagFilter(false) }}
                    className="w-full text-left px-3 h-8 text-[12.5px] text-text-muted hover:bg-surface"
                  >
                    Alle anzeigen
                  </button>
                  {allTagNames.map(tag => (
                    <button
                      key={tag}
                      onClick={() => { setTagFilter(tag); setShowTagFilter(false) }}
                      className="w-full text-left px-3 h-8 text-[12.5px] hover:bg-surface flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full flex-none" style={{ background: tagColor(tag) }} />
                      <span style={{ color: tagFilter === tag ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>{tag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(v => !v)}
              title="Exportieren"
              className="flex items-center gap-1 h-7 px-2 rounded gutter-hover text-text-faint transition-colors text-[11.5px] font-medium"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Export
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showExportMenu && (
              <div
                className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg border border-border-strong shadow-window min-w-[180px]"
                style={{ background: 'var(--color-bg)' }}
              >
                {([
                  ['txt', 'Ordnerstruktur (.txt)', '0 0 24 24', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5'],
                  ['csv', 'Dateiliste (.csv)', '0 0 24 24', 'M3 3h18M3 9h18M3 15h18M3 21h18'],
                  ['html', 'Bericht (.html)', '0 0 24 24', 'M2 12l5-7v4h10V5l5 7-5 7v-4H7v4z'],
                ] as [string, string, string, string][]).map(([fmt, label, vb, d]) => (
                  <button
                    key={fmt}
                    onClick={() => doExport(fmt as 'txt' | 'csv' | 'html')}
                    className="w-full text-left flex items-center gap-2.5 px-3.5 h-[32px] text-[12.5px] text-text-muted transition-colors hover:bg-surface"
                  >
                    <svg width="13" height="13" viewBox={vb} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                      {d.split(' M').map((seg, i) => <path key={i} d={(i === 0 ? seg : 'M' + seg)} />)}
                    </svg>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => loadEntries(currentPath)}
            title="Aktualisieren"
            className="flex items-center justify-center h-7 w-7 rounded gutter-hover text-text-faint transition-colors"
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
            sortedEntries.map((entry) => {
              const isSelected = selectedFiles.has(entry.path)
              const tags = fileTags[entry.path] ?? []
              return (
              <div
                key={entry.path}
                draggable={!isSelected}
                onDragStart={(e) => handleDragStart(e, entry)}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    if (!entry.isFolder) toggleFileSelection(entry.path)
                    return
                  }
                  setSelected(entry)
                  if (selectedFiles.size > 0) clearFileSelection()
                  if (entry.isFolder) navigate(entry.path, entry.name)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setCtxMenu({ x: e.clientX, y: e.clientY, entry })
                }}
                onDragOver={(e) => handleDragOver(e, entry)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, entry)}
                className={`flex items-center gap-2.5 px-3 py-1 cursor-pointer transition-colors duration-100 btn-ghost rounded-md ${
                  isSelected
                    ? 'bg-accent/[0.10] text-text-primary'
                    : selected?.path === entry.path
                    ? 'bg-accent/[0.08] text-text-primary'
                    : 'text-text-muted'
                } ${dragOverPath === entry.path ? 'bg-accent/[0.12]' : ''}`}
                style={{ minHeight: 32 }}
              >
                {selectedFiles.size > 0 && !entry.isFolder && (
                  <div
                    className="flex-none w-4 h-4 rounded border flex items-center justify-center"
                    style={{
                      borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border-strong)',
                      background: isSelected ? 'var(--color-accent)' : 'transparent'
                    }}
                  >
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                    )}
                  </div>
                )}
                <FileIcon entry={entry} />
                <div className="flex-1 min-w-0">
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
                      className="w-full text-[12.5px] border border-accent rounded px-1 outline-none"
                      style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                    />
                  ) : (
                    <span className="block truncate text-[12.5px]">{entry.name}</span>
                  )}
                  {tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-px rounded-full font-medium text-white leading-none"
                          style={{ background: tagColor(tag) }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )})
          )}
          {hasMore && !loading && (
            <div className="flex items-center justify-center py-2">
              <button
                onClick={loadMore}
                className="h-7 px-3 rounded text-[11.5px] font-medium text-text-muted transition-colors hover:bg-surface btn-ghost"
              >
                Mehr laden ({entries.length})
              </button>
            </div>
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
          <div className="flex flex-col border-b border-border">
            <div className="flex items-center gap-3 px-5" style={{ height: 40, minHeight: 40 }}>
              <FileIcon entry={selected} />
              <span className="text-[13px] font-medium text-text-primary flex-1 min-w-0 truncate">{selected.name}</span>
              <button
                onClick={() => window.nestor.shell.openPath(selected.path)}
                className="text-[12px] text-text-muted hover:text-text-primary transition-colors flex-none"
              >
                Öffnen
              </button>
            </div>
            {!selected.isFolder && (
              <div className="flex flex-wrap items-center gap-1.5 px-5 pb-2">
                {(fileTags[selected.path] ?? []).map(tag => (
                  <button
                    key={tag}
                    onClick={() => removeTagFromFile(selected.path, tag)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium text-white leading-none transition-opacity hover:opacity-75"
                    style={{ background: tagColor(tag) }}
                    title="Klicken zum Entfernen"
                  >
                    {tag}
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                ))}
                {activeTagFile === selected.path ? (
                  <div className="relative flex items-center">
                    <input
                      ref={tagInputRef}
                      autoFocus
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          await addTagToFile(selected.path, tagInput)
                          setTagInput('')
                          setActiveTagFile(null)
                        }
                        if (e.key === 'Escape') { setTagInput(''); setActiveTagFile(null) }
                      }}
                      onBlur={() => { setTagInput(''); setActiveTagFile(null) }}
                      list="tag-suggestions"
                      placeholder="Tag eingeben…"
                      className="h-6 px-2 rounded-full border border-accent text-[11px] outline-none w-32"
                      style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                    />
                    <datalist id="tag-suggestions">
                      {tagSuggestions.map(t => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveTagFile(selected.path)}
                    className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-border-strong text-text-hint hover:border-accent hover:text-accent transition-colors"
                  >
                    + Tag
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <Preview entry={selected} />
      </div>

      {/* Batch Rename Modal */}
      {showBatchRename && (
        <BatchRenameModal
          files={sortedEntries.filter(e => selectedFiles.has(e.path))}
          onClose={() => setShowBatchRename(false)}
          onDone={() => { clearFileSelection(); loadEntries(currentPath) }}
        />
      )}

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
