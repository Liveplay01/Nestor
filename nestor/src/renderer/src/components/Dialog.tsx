import React, { useState, useEffect, useRef } from 'react'

export function Backdrop({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 z-40"
      style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}
      onClick={onClick}
    />
  )
}

export function DialogBox({ children, maxWidth = 360 }: { children: React.ReactNode; maxWidth?: number }): React.JSX.Element {
  return (
    <div
      className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full rounded-xl border border-border-strong shadow-window p-5"
      style={{ maxWidth, background: 'var(--color-bg)' }}
    >
      {children}
    </div>
  )
}

export interface ConfirmDialogProps {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  message,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  danger,
  onConfirm,
  onCancel
}: ConfirmDialogProps): React.JSX.Element {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onConfirm, onCancel])

  return (
    <>
      <Backdrop onClick={onCancel} />
      <DialogBox>
        <p className="text-[13.5px] text-text-primary leading-snug">{message}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="h-8 px-4 rounded-lg text-[12.5px] font-medium text-text-muted transition-colors hover:bg-surface border border-border-strong"
            style={{ background: 'var(--color-bg)' }}
          >
            {cancelLabel}
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            className="h-8 px-4 rounded-lg text-[12.5px] font-medium text-white transition-colors"
            style={{ background: danger ? '#DC2626' : '#2563EB' }}
          >
            {confirmLabel}
          </button>
        </div>
      </DialogBox>
    </>
  )
}

export interface PromptDialogProps {
  label: string
  defaultValue?: string
  placeholder?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function PromptDialog({
  label,
  defaultValue = '',
  placeholder,
  onConfirm,
  onCancel
}: PromptDialogProps): React.JSX.Element {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const submit = (): void => {
    if (value.trim()) onConfirm(value.trim())
  }

  return (
    <>
      <Backdrop onClick={onCancel} />
      <DialogBox>
        <label className="text-[13px] font-medium text-text-primary block mb-2.5">{label}</label>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onCancel()
            e.stopPropagation()
          }}
          placeholder={placeholder}
          className="w-full h-9 px-3 border border-border-strong rounded-lg text-[13px] outline-none transition-all focus:border-accent-focus focus:shadow-[0_0_0_3px_#2563EB14]"
          style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="h-8 px-4 rounded-lg text-[12.5px] font-medium text-text-muted transition-all duration-150 btn-ghost border border-border-strong"
            style={{ background: 'var(--color-bg)' }}
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="h-8 px-4 rounded-lg text-[12.5px] font-medium text-white transition-colors disabled:opacity-40"
            style={{ background: '#2563EB' }}
          >
            OK
          </button>
        </div>
      </DialogBox>
    </>
  )
}
