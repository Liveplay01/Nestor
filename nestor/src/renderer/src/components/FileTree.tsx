import React, { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { getFileColor } from '../lib/fileColors'
import type { FileEntry } from '@shared/types'

function FileIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M6.5 3.5h7l4 4v12.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" />
      <path d="M13.5 3.5V8h4" />
    </svg>
  )
}

function FolderIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C7C85" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M3 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5V17a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 17V7z" />
    </svg>
  )
}

function Chevron({ open }: { open: boolean }): React.JSX.Element {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9A9AA2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flex: 'none' }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

interface EntryRowProps {
  entry: FileEntry
  depth: number
}

function EntryRow({ entry, depth }: EntryRowProps): React.JSX.Element {
  const { openFolders, toggleFolder } = useStore()
  const isOpen = openFolders.has(entry.path)
  const indent = 6 + depth * 18

  if (entry.isFolder) {
    return (
      <>
        <div
          className="flex items-center gap-1.5 rounded-md cursor-pointer text-text-secondary transition-colors duration-100 hover:bg-black/[0.04]"
          style={{ padding: `5px 6px 5px ${indent}px` }}
          onClick={() => toggleFolder(entry.path)}
        >
          <Chevron open={isOpen} />
          <FolderIcon />
          <span className="text-[13px] font-medium">{entry.name}</span>
        </div>

        <div
          style={{
            overflow: 'hidden',
            maxHeight: isOpen ? '2000px' : '0px',
            opacity: isOpen ? 1 : 0,
            transition: 'max-height 0.32s cubic-bezier(.4,0,.2,1), opacity 0.25s ease'
          }}
        >
          {entry.children?.map((child) => (
            <EntryRow key={child.path} entry={child} depth={depth + 1} />
          ))}
        </div>
      </>
    )
  }

  const color = getFileColor(entry.name)
  return (
    <div
      className="flex items-center gap-[7px] rounded-md cursor-default transition-colors duration-100 hover:bg-black/[0.04]"
      style={{ padding: `4px 6px 4px ${indent + 18}px` }}
    >
      <FileIcon color={color} />
      <span className="text-[12.5px] text-text-muted">{entry.name}</span>
    </div>
  )
}

export default function FileTree(): React.JSX.Element {
  const { settings, fileTree, setFileTree, openFolders, toggleFolder } = useStore()
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<FileEntry[] | null>(null)

  const loadTree = useCallback(async () => {
    const root = settings?.rootFolder
    if (!root) return
    const tree = await window.nestor.fs.listDir(root)
    setFileTree(tree)
  }, [settings?.rootFolder, setFileTree])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  // Listen for file system changes
  useEffect(() => {
    const unsub = window.nestor.fs.onChanged(() => loadTree())
    return unsub
  }, [loadTree])

  // Search
  useEffect(() => {
    if (!search.trim() || !settings?.rootFolder) {
      setSearchResults(null)
      return
    }
    const t = setTimeout(async () => {
      const results = await window.nestor.fs.search(settings.rootFolder, search)
      setSearchResults(results)
    }, 300)
    return () => clearTimeout(t)
  }, [search, settings?.rootFolder])

  const addFolder = async () => {
    const root = settings?.rootFolder
    if (!root) return
    const name = prompt('Ordnername:')
    if (!name) return
    const path = root + '/' + name
    await window.nestor.fs.createFolder(path)
  }

  const displayTree = searchResults ?? fileTree

  return (
    <div
      className="flex flex-col border-r border-border bg-surface"
      style={{ width: 240, minWidth: 240, minHeight: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-[15px] pb-[9px]">
        <span className="text-[13px] font-semibold text-text-secondary tracking-tight">Dateien</span>
        <button
          onClick={addFolder}
          className="flex items-center justify-center rounded-md text-text-faint transition-colors duration-150 hover:bg-black/[0.05]"
          style={{ width: 24, height: 24 }}
          title="Neuer Ordner"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5V17a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 17V7.5z" />
            <path d="M12 11v4M10 13h4" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="relative mx-3 mb-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A8AE" strokeWidth="1.8" strokeLinecap="round" className="absolute left-[9px] top-[8px] pointer-events-none">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Dateien suchen…"
          className="w-full h-[30px] pl-7 pr-2.5 border border-border-strong rounded-md bg-white text-[12.5px] text-text-secondary outline-none transition-all duration-150 focus:border-accent-focus focus:shadow-[0_0_0_3px_#2563EB14]"
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-0.5 px-2 pb-4">
        {!settings?.rootFolder ? (
          <div className="text-[12.5px] text-text-hint text-center mt-8 px-4">
            Wähle einen Ordner im Onboarding aus.
          </div>
        ) : displayTree.length === 0 ? (
          <div className="text-[12.5px] text-text-hint text-center mt-8 px-4">
            {search ? 'Keine Ergebnisse.' : 'Ordner ist leer.'}
          </div>
        ) : (
          displayTree.map((entry) => (
            <EntryRow key={entry.path} entry={entry} depth={0} />
          ))
        )}
      </div>
    </div>
  )
}
