import React from 'react'
import { useStore } from '../store/useStore'

export default function TitleBar(): React.JSX.Element {
  const settings = useStore((s) => s.settings)

  const minimize = () => window.nestor.window.minimize()
  const maximize = () => window.nestor.window.maximize()
  const close = () => window.nestor.window.close()

  const folderName = settings?.rootFolder
    ? settings.rootFolder.split(/[/\\]/).pop()
    : 'Kein Ordner gewählt'

  return (
    <div
      className="drag-region no-select flex items-center justify-between px-3 pl-4 border-b border-border bg-surface"
      style={{ height: 46, minHeight: 46 }}
    >
      {/* Left: app identity */}
      <div className="flex items-center gap-2.5 no-drag">
        <div
          className="flex items-center justify-center rounded-lg flex-none"
          style={{ width: 23, height: 23, background: '#2563EB' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5v7.5A1.5 1.5 0 0 1 19 18.5H4.5A1.5 1.5 0 0 1 3 17V7.5z" />
          </svg>
        </div>
        <span className="text-[13.5px] font-semibold text-text-primary tracking-tight">Nestor</span>
        <span className="text-[12.5px] text-text-hint">/</span>
        <span className="text-[12.5px] text-text-faint">{folderName}</span>
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
