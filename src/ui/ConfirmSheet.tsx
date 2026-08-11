// An in-app confirmation, replacing window.confirm().
//
// Native dialogs are the wrong tool here for three reasons: they look nothing
// like the app, they are suppressed outright in some installed-PWA and in-app
// browser contexts (so a destructive action would fire with no prompt at all,
// or silently not fire), and they block the whole event loop while open.
//
// Rendered as a bottom sheet, because everything else in this app that asks a
// question is a bottom sheet.

import { useEffect, useRef } from 'react'
import { t } from '@/i18n'

export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body?: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Focus the *safe* choice, and let Escape back out. A confirmation whose
  // default action is the destructive one is a trap.
  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[430px] rounded-t-3xl bg-paper p-5 pb-8 text-ink animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-extrabold">{title}</h2>
        {body && <p className="mt-1 text-sm text-muted">{body}</p>}
        <div className="mt-5 space-y-2">
          <button
            className={`btn w-full ${destructive ? 'bg-berry text-white' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button ref={cancelRef} className="btn-ghost w-full" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
