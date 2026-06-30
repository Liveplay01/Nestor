import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import NestorLogo from './NestorLogo'

export default function TitleBar(): React.JSX.Element {
  const { settings, patchSettings, setActiveNav } = useStore()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const minimize = () => window.nestor.window.minimize()
  const maximize = () => window.nestor.window.maximize()
  const close = () => window.nestor.window.close()

  const hasFolder = Boolean(settings?.rootFolder)
  const folderName = settings?.rootFolder ? settings.rootFolder.split(/[/\\]/).pop() : null
  const workspaces = settings?.workspaces ?? []

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSwitch = async (path: string) => {
    setOpen(false)
    if (path === settings?.rootFolder) return
    await window.nestor.app.switchWorkspace(path)
    patchSettings({ rootFolder: path })
  }

  const handleAddWorkspace = async () => {
    setOpen(false)
    const result = await window.nestor.app.addWorkspace()
    if (result) {
      patchSettings({ rootFolder: result.rootFolder, workspaces: result.workspaces })
    }
  }

  return (
    <div
      className="drag-region no-select flex items-center justify-between px-3 pl-4 border-b border-border bg-surface"
      style={{ height: 46, minHeight: 46, position: 'relative', zIndex: 100 }}
    >
      {/* Left: app identity + workspace switcher */}
      <div className="flex items-center gap-2.5 no-drag" ref={dropdownRef}>
        <NestorLogo size={24} />
        <span className="text-[13.5px] font-semibold text-text-primary tracking-tight">Nestor</span>

        {hasFolder ? (
          <>
            <span className="text-[12.5px] text-text-hint">/</span>
            <button
              onClick={() => setOpen(v => !v)}
              className="flex items-center gap-1 text-[12.5px] text-text-faint hover:text-text-muted transition-colors rounded px-1 py-0.5 -mx-1 hover:bg-black/[0.04] group"
            >
              <span>{folderName}</span>
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round"
                className="mt-px text-text-hint opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {open && (
              <div
                className="absolute border border-border rounded-xl shadow-xl overflow-hidden"
                style={{ top: 44, left: 0, minWidth: 230, background: 'var(--color-surface)', zIndex: 999 }}
              >
                {workspaces.length > 0 && (
                  <div className="py-1.5">
                    {workspaces.map(ws => {
                      const name = ws.split(/[/\\]/).pop()
                      const isActive = ws === settings?.rootFolder
                      return (
                        <button
                          key={ws}
                          onClick={() => handleSwitch(ws)}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.04]"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-hint flex-none">
                            <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          </svg>
                          <span className="text-[13px] text-text-primary flex-1 truncate">{name}</span>
                          {isActive && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--color-accent)', flexShrink: 0 }}>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {workspaces.length > 0 && <div className="border-t border-border mx-2" />}

                <div className="py-1.5">
                  <button
                    onClick={handleAddWorkspace}
                    disabled={workspaces.length >= 5}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.04] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-accent)', flexShrink: 0 }}>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--color-accent)' }}>
                      {workspaces.length >= 5 ? 'Max. 5 Bereiche erreicht' : 'Ordner hinzufügen'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => setActiveNav('settings')}
            className="no-drag text-[12px] font-medium px-2.5 py-1 rounded-md transition-colors hover:bg-black/[0.05]"
            style={{ color: '#2563EB' }}
          >
            Ordner auswählen um zu beginnen →
          </button>
        )}
      </div>

      {/* Right: window controls */}
      <div className="flex items-center gap-0.5 no-drag">
        <button
          onClick={minimize}
          className="flex items-center justify-center text-text-faint transition-all duration-150 rounded-[7px] btn-ghost"
          style={{ width: 30, height: 30 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          onClick={maximize}
          className="flex items-center justify-center text-text-faint transition-all duration-150 rounded-[7px] btn-ghost"
          style={{ width: 30, height: 30 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
            <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" />
          </svg>
        </button>
        <button
          onClick={close}
          className="flex items-center justify-center text-text-faint transition-all duration-150 rounded-[7px] btn-ghost hover:text-red-500 hover:bg-red-500/10"
          style={{ width: 30, height: 30 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
