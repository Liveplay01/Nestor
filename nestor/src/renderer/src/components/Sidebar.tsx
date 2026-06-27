import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import type { NavSection } from '@shared/types'

interface NavItem {
  id: NavSection
  icon: React.ReactNode
  label: string
}

const ICONS: NavItem[] = [
  {
    id: 'home',
    label: 'Übersicht',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11.5v7.5a1 1 0 0 0 1 1h3.5v-5h7v5H19a1 1 0 0 0 1-1v-7.5" />
        <path d="M2.5 12L12 3.5l9.5 8.5" />
      </svg>
    )
  },
  {
    id: 'files',
    label: 'Explorer',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8.5A1.5 1.5 0 0 1 20.5 9.5v7.5A1.5 1.5 0 0 1 19 18.5H4.5A1.5 1.5 0 0 1 3 17V7.5z" />
      </svg>
    )
  },
  {
    id: 'chat',
    label: 'KI-Chat',
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
    label: 'Einstellungen',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" />
      </svg>
    )
  }
]

const SHORT_LABELS: Record<string, string> = {
  home: 'Home',
  files: 'Dateien',
  chat: 'Chat',
  settings: 'Einst.'
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const shortLabel = SHORT_LABELS[item.id] ?? item.label

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="no-select relative flex flex-col items-center justify-center gap-[3px] rounded-btn btn-press"
        style={{ width: 48, height: 44 }}
      >
        {active && (
          <motion.div
            layoutId="nav-active-bg"
            className="absolute inset-0 rounded-btn"
            style={{ background: 'var(--color-accent)', opacity: 0.1 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          />
        )}
        <span
          className="relative z-10 transition-colors duration-150"
          style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-faint)' }}
        >
          {item.icon}
        </span>
        <span
          className="relative z-10 text-[9.5px] font-medium leading-none transition-colors duration-150"
          style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-hint)' }}
        >
          {shortLabel}
        </span>
      </button>

      {/* Custom tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.14, delay: 0.35 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none"
          >
            <div
              className="whitespace-nowrap text-[12px] font-medium px-2.5 py-1.5 rounded-lg shadow-window"
              style={{
                background: 'var(--color-text-primary)',
                color: 'var(--color-bg)',
                letterSpacing: '0.01em'
              }}
            >
              {item.label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Sidebar(): React.JSX.Element {
  const { activeNav, setActiveNav } = useStore()

  return (
    <div
      className="flex flex-col items-center border-r border-border py-2 gap-0.5 no-select"
      style={{ width: 64, minWidth: 64, background: 'var(--color-sidebar)' }}
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
