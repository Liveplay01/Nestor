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

const TEXT_EXTS = new Set(['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.xml', '.yaml', '.yml', '.sh', '.py', '.go', '.rs', '.toml', '.env'])
const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico'])

function Preview({ entry }: { entry: FileEntry | null }): React.JSX.Element {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!entry || entry.isFolder) { setContent(null); return }
    const ext = '.' + entry.name.split('.').pop()?.toLowerCase()
    if (TEXT_EXTS.has(ext)) {
      setLoading(true)
      window.nestor.fs.readFile(entry.path)
        .then((c: string) => setContent(c))
        .catch(() => setContent(null))
        .finally(() => setLoading(false))
    } else {
      setContent(null)
    }
  }, [entry?.path])

  if (!entry) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-hint text-[13px]">
        Datei auswählen
      </div>
    )
  }

  const ext = '.' + entry.name.split('.').pop()?.toLowerCase()

  if (entry.isFolder) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-hint text-[13px]">
        Ordner ausgewählt
      </div>
    )
  }

  if (IMG_EXTS.has(ext)) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <img src={`file://${entry.path}`} alt={entry.name} className="max-w-full max-h-full object-contain rounded-lg" />
      </div>
    )
  }

  if (ext === '.pdf') {
    return (
      <iframe
        src={`file://${entry.path}`}
        className="flex-1 border-none"
        style={{ background: 'var(--color-surface)' }}
        title={entry.name}
      />
    )
  }

  if (TEXT_EXTS.has(ext)) {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
      )
    }
    return (
      <div className="flex-1 overflow-auto p-5">
        <pre className="text-[12.5px] leading-[1.7] text-text-secondary font-mono whitespace-pre-wrap break-words m-0">
          {content ?? 'Inhalt konnte nicht geladen werden'}
        </pre>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-hint">
      <div className="text-[13px]">Vorschau nicht verfügbar</div>
      <button
        onClick={() => window.nestor.shell.openPath(entry.path)}
        className="h-8 px-4 rounded-lg text-[12.5px] font-medium transition-colors hover:bg-surface border border-border-strong text-text-muted"
        style={{ background: 'var(--color-bg)' }}
      >
        Mit Standardprogramm öffnen
      </button>
    </div>
  )
}

// ─── Explorer ──────────────────────────────────────────────────────────────

export default function Explorer(): React.JSX.Element {
  const { settings, addHistoryItem } = useStore()
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
          await window.nestor.fs.createFile(newPath)
          loadEntries(currentPath)
        }
      })
      return
    }
  }

  const submitRename = async () => {
    if (!renaming || !renameValue.trim()) { setRenaming(null); return }
    const item = await window.nestor.fs.renameFile(renaming, renameValue.trim())
    if (item) addHistoryItem(item)
    setRenaming(null)
    loadEntries(currentPath)
  }

  const handlePaste = async () => {
    if (!clipboard) return
    const sep = currentPath.includes('/') ? '/' : '\\'
    const dest = `${currentPath}${sep}${clipboard.entry.name}`
    let item
    if (clipboard.cut) {
      item = await window.nestor.fs.moveFile(clipboard.entry.path, dest)
      setClipboard(null)
    } else {
      item = await window.nestor.fs.copyFile(clipboard.entry.path, dest)
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
