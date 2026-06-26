import React from 'react'
import { useStore } from '../store/useStore'
import NestorLogo from './NestorLogo'

export default function TitleBar(): React.JSX.Element {
  const { settings, setActiveNav } = useStore()

  const minimize = () => window.nestor.window.minimize()
  const maximize = () => window.nestor.window.maximize()
  const close = () => window.nestor.window.close()

  const hasFolder = Boolean(settings?.rootFolder)
  const folderName = settings?.rootFolder
    ? settings.rootFolder.split(/[/\\]/).pop()
    : null

  return (
    <div
      className="drag-region no-select flex items-center justify-between px-3 pl-4 border-b border-border bg-surface"
      style={{ height: 46, minHeight: 46 }}
    >
      {/* Left: app identity */}
      <div className="flex items-center gap-2.5 no-drag">
        <NestorLogo size={24} />
        <span className="text-[13.5px] font-semibold text-text-primary tracking-tight">Nestor</span>
        {hasFolder ? (
          <>
            <span className="text-[12.5px] text-text-hint">/</span>
            <span className="text-[12.5px] text-text-faint">{folderName}</span>
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
          className="flex items-center justify-center text-text-faint transition-all duration-150 hover:bg-black/[0.06] rounded-[7px]"
          style={{ width: 30, height: 30 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          onClick={maximize}
          className="flex items-center justify-center text-text-faint transition-all duration-150 hover:bg-black/[0.06] rounded-[7px]"
          style={{ width: 30, height: 30 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
            <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" />
          </svg>
        </button>
        <button
          onClick={close}
          className="flex items-center justify-center text-text-faint transition-all duration-150 hover:bg-red-500 hover:text-white rounded-[7px]"
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
