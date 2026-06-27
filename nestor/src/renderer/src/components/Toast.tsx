import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import type { ToastItem } from '@shared/types'

function ToastIcon({ type }: { type: ToastItem['type'] }): React.JSX.Element {
  if (type === 'success') return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
  if (type === 'error') return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
    </svg>
  )
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
    </svg>
  )
}

const DOT_COLOR: Record<ToastItem['type'], string> = {
  success: '#16A34A',
  error: '#DC2626',
  info: 'var(--color-accent)'
}

export default function ToastContainer(): React.JSX.Element {
  const { toasts, dismissToast } = useStore()

  return (
    <div className="fixed top-[58px] right-4 z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 320 }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 2800)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-border-strong shadow-window"
      style={{ background: 'var(--color-bg)', borderLeft: `3px solid ${DOT_COLOR[toast.type]}` }}
    >
      <ToastIcon type={toast.type} />
      <span className="text-[13px] font-medium text-text-secondary flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-text-hint hover:text-text-muted transition-colors ml-1 flex-none"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </motion.div>
  )
}
