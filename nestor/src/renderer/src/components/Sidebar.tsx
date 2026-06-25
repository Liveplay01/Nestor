import React from 'react'
import { useStore } from '../store/useStore'
import type { NavSection } from '@shared/types'

const ACCENT = '#2563EB'

interface NavItem {
  id: NavSection
  icon: React.ReactNode
}

const ICONS: NavItem[] = [
  {
    id: 'home',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11.5v7.5a1 1 0 0 0 1 1h3.5v-5h7v5H19a1 1 0 0 0 1-1v-7.5" />
        <path d="M2.5 12L12 3.5l9.5 8.5" />
      </svg>
    )
  },
  {
    id: 'files',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5v7.5A1.5 1.5 0 0 1 19 18.5H4.5A1.5 1.5 0 0 1 3 17V7.5z" />
      </svg>
    )
  },
  {
    id: 'chat',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9.5L5 19v-3.5H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" />
      </svg>
    )
  }
]

const BOTTOM_ICONS: NavItem[] = [
  {
    id: 'settings',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" />
      </svg>
    )
  },
  {
    id: 'help',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.3c-.8.45-1.1.9-1.1 1.9" />
        <circle cx="12" cy="16.8" r=".7" fill="currentColor" stroke="none" />
      </svg>
    )
  }
]

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="no-select flex items-center justify-center rounded-btn transition-all duration-150"
      style={{
        width: 36,
        height: 36,
        background: active ? ACCENT + '14' : 'transparent',
        color: active ? ACCENT : '#71717A'
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {item.icon}
    </button>
  )
}

export default function Sidebar(): React.JSX.Element {
  const { activeNav, setActiveNav } = useStore()

  return (
    <div
      className="flex flex-col items-center border-r border-border bg-sidebar py-2.5 gap-1 no-select"
      style={{ width: 52, minWidth: 52 }}
    >
      {ICONS.map((item) => (
        <NavButton
          key={item.id}
          item={item}
          active={activeNav === item.id}
          onClick={() => setActiveNav(item.id)}
        />
      ))}

      <div className="flex-1" />

      {BOTTOM_ICONS.map((item) => (
        <NavButton
          key={item.id}
          item={item}
          active={activeNav === item.id}
          onClick={() => setActiveNav(item.id)}
        />
      ))}
    </div>
  )
}
