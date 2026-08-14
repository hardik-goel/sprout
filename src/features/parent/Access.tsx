// Who can open what.
//
// Two different jobs on one screen, because they are the same question asked
// twice: the parent lock keeps a child out of the screens where points are
// awarded, and each child's own lock keeps a sibling out of their day. Both
// are child locks, not security — `domain/pin.ts` says exactly how far to
// trust them, and this screen says the same thing in the parent's language.

import { useState } from 'react'
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck, Unlock, X } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PinPad } from '@/ui/PinPad'
import { ConfirmSheet } from '@/ui/ConfirmSheet'
import { hasPin } from '@/domain'
import { t } from '@/i18n'

type Target = { kind: 'parent' } | { kind: 'child'; id: string; name: string }

export function Access() {
  const data = useStore((s) => s.data)
  const children = useStore((s) => s.childViews())
  const setParentPin = useStore((s) => s.setParentPin)
  const setChildPin = useStore((s) => s.setChildPin)
  const setChildAccess = useStore((s) => s.setChildAccess)

  const [setting, setSetting] = useState<Target | null>(null)
  const [firstEntry, setFirstEntry] = useState<string | null>(null)
  const [clearing, setClearing] = useState<Target | null>(null)

  function close() {
    setSetting(null)
    setFirstEntry(null)
  }

  /** Two entries, because a PIN typed once and mistyped locks the parent out. */
  function submit(pin: string): boolean {
    if (firstEntry === null) {
      setFirstEntry(pin)
      return true
    }
    if (pin !== firstEntry) {
      setFirstEntry(null)
      return false
    }
    if (setting?.kind === 'parent') setParentPin(pin)
    else if (setting?.kind === 'child') setChildPin(setting.id, pin)
    close()
    return true
  }

  function clear(target: Target) {
    if (target.kind === 'parent') setParentPin(null)
    else setChildPin(target.id, null)
  }

  const parentLocked = hasPin(data.parentPinHash)

  return (
    <div className="pb-10">
      <PageHeader title={t('access.title')} subtitle={t('access.subtitle')} />

      <div className="space-y-4 px-5">
        {/* Parent lock */}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
            <ShieldCheck size={14} /> {t('access.parentLock')}
          </h2>
          <p className="mt-2 text-sm text-muted">{t('access.parentLock.blurb')}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className={`chip ${parentLocked ? 'bg-sprout/15 text-sprout' : 'bg-line text-muted'}`}>
              {parentLocked ? <Lock size={13} /> : <Unlock size={13} />}
              {parentLocked ? t('access.on') : t('access.off')}
            </span>
            <button
              className="btn-ghost ml-auto px-3 py-2 text-sm"
              onClick={() => setSetting({ kind: 'parent' })}
            >
              <KeyRound size={15} /> {parentLocked ? t('access.change') : t('access.setPin')}
            </button>
            {parentLocked && (
              <button
                className="btn-ghost px-3 py-2 text-sm text-berry"
                onClick={() => setClearing({ kind: 'parent' })}
              >
                {t('access.remove')}
              </button>
            )}
          </div>
        </section>

        {/* Per-child sign-in */}
        {children.map((c) => {
          const locked = hasPin(c.pinHash)
          return (
            <section key={c.id} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{c.avatar}</span>
                <div className="flex-1">
                  <div className="font-extrabold">{c.name}</div>
                  <div className="text-xs text-muted">
                    {locked ? t('access.child.locked') : t('access.child.open')}
                  </div>
                </div>
              </div>

              <label
                htmlFor={`username-${c.id}`}
                className="mt-4 block text-sm font-semibold text-muted"
              >
                {t('access.username')}
              </label>
              <input
                id={`username-${c.id}`}
                value={c.username ?? ''}
                onChange={(e) => setChildAccess(c.id, { username: e.target.value })}
                placeholder={c.name}
                className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 font-semibold outline-none focus:border-sprout"
              />
              <p className="mt-1 text-xs text-muted">{t('access.username.hint')}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  className="btn-ghost px-3 py-2 text-sm"
                  onClick={() => setSetting({ kind: 'child', id: c.id, name: c.name })}
                >
                  <KeyRound size={15} /> {locked ? t('access.change') : t('access.setPin')}
                </button>
                {locked && (
                  <button
                    className="btn-ghost px-3 py-2 text-sm text-berry"
                    onClick={() => setClearing({ kind: 'child', id: c.id, name: c.name })}
                  >
                    {t('access.remove')}
                  </button>
                )}
              </div>

              {/* Sibling visibility — read-only either way, and off by default. */}
              <button
                onClick={() => setChildAccess(c.id, { canSeeSiblings: !c.canSeeSiblings })}
                aria-pressed={!!c.canSeeSiblings}
                className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sprout/10">
                  {c.canSeeSiblings ? (
                    <Eye size={17} className="text-sprout" />
                  ) : (
                    <EyeOff size={17} className="text-muted" />
                  )}
                </span>
                <span className="flex-1 text-sm font-semibold">
                  {t('access.siblings', { name: c.name })}
                  <span className="block text-xs font-normal text-muted">
                    {t('access.siblings.hint')}
                  </span>
                </span>
                <span
                  className={`h-6 w-11 shrink-0 rounded-full p-1 transition ${
                    c.canSeeSiblings ? 'bg-sprout' : 'bg-line'
                  }`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white transition ${
                      c.canSeeSiblings ? 'translate-x-5' : ''
                    }`}
                  />
                </span>
              </button>
            </section>
          )
        })}

        {children.length === 0 && <p className="text-center text-sm text-muted">{t('tasks.needChild')}</p>}

        <p className="px-1 text-center text-xs text-muted">{t('access.honesty')}</p>
      </div>

      {/* Set / change a PIN: type it, then type it again. */}
      {setting && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-[430px] rounded-t-3xl bg-paper pb-6 animate-rise">
            <div className="flex justify-end p-3">
              <button onClick={close} aria-label={t('common.close')}>
                <X size={22} className="text-muted" />
              </button>
            </div>
            <PinPad
              title={
                setting.kind === 'parent'
                  ? t('access.parentLock')
                  : t('access.child.pinTitle', { name: setting.name })
              }
              subtitle={firstEntry === null ? t('access.enterNew') : t('access.enterAgain')}
              onSubmit={submit}
            />
          </div>
        </div>
      )}

      <ConfirmSheet
        open={clearing !== null}
        title={t('access.remove.title')}
        body={
          clearing?.kind === 'parent'
            ? t('access.remove.parentBody')
            : t('access.remove.childBody', { name: clearing?.name ?? '' })
        }
        confirmLabel={t('access.remove')}
        destructive
        onCancel={() => setClearing(null)}
        onConfirm={() => {
          if (clearing) clear(clearing)
          setClearing(null)
        }}
      />
    </div>
  )
}
