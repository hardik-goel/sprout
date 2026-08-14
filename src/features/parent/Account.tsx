// The account screen for an app with no accounts.
//
// There is no sign-up, no login and no log-out, and that is the product
// decision — a parent should not need a password to give their four-year-old a
// star. What a parent *does* need is the answer to "whose phone is this, what
// am I paying, and what happens to our year of photos if this phone dies".
// That is what this screen is: their details, their plan, and a backup file
// they own, in one place.

import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Download,
  Flame,
  HardDrive,
  Languages,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { ConfirmSheet } from '@/ui/ConfirmSheet'
import {
  backupFilename,
  buildBackup,
  formatBytes,
  parseBackup,
  storageBytes,
  type BackupFile,
} from '@/lib/backup'
import { formatShortDate } from '@/i18n/format'
import { LOCALES, t } from '@/i18n'

export function Account() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const children = useStore((s) => s.childViews())
  const updateProfile = useStore((s) => s.updateProfile)
  const restore = useStore((s) => s.restoreBackup)
  const startFresh = useStore((s) => s.startFresh)
  const setSoundOn = useStore((s) => s.setSoundOn)
  const parentStreak = useStore((s) => s.parentStreak())
  const fileInput = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(data.parentName)
  const [email, setEmail] = useState(data.parentEmail ?? '')
  const [phone, setPhone] = useState(data.parentPhone ?? '')
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [freshening, setFreshening] = useState(false)
  const soundOn = data.soundOn !== false
  // `display-mode: standalone` is true only when launched from the home screen.
  const standalone =
    typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches

  const dirty =
    name.trim() !== data.parentName ||
    email.trim() !== (data.parentEmail ?? '') ||
    phone.trim() !== (data.parentPhone ?? '')

  function save() {
    updateProfile({ parentName: name, parentEmail: email, parentPhone: phone })
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  function exportBackup() {
    const file = buildBackup(data)
    const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFilename(data)
    a.click()
    // Revoking immediately can cancel the download in some browsers; one tick
    // is enough for the click to have been handed off.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function pickBackup(file: File | undefined) {
    if (!file) return
    setError(null)
    const result = parseBackup(await file.text())
    if (!result.ok) {
      setError(t(`account.restore.error.${result.reason}`))
      return
    }
    setPending(result.backup)
  }

  const locale = LOCALES.find((l) => l.code === data.locale)?.label ?? data.locale
  const since = data.createdAt ? formatShortDate(data.createdAt.slice(0, 10)) : null
  const plusSince = data.plusSince ? formatShortDate(data.plusSince.slice(0, 10)) : null

  return (
    <div className="pb-10">
      <PageHeader title={t('account.title')} subtitle={t('account.subtitle')} />

      <div className="space-y-4 px-5">
        {/* Personal details */}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
            <User size={14} /> {t('account.you')}
          </h2>

          <label htmlFor="account-name" className="mt-3 block text-sm font-semibold text-muted">
            {t('common.name')}
          </label>
          <input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 font-semibold outline-none focus:border-sprout"
          />

          <label htmlFor="account-email" className="mt-4 block text-sm font-semibold text-muted">
            <Mail size={13} className="mr-1 inline" />
            {t('account.email')}
          </label>
          <input
            id="account-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('account.emailPlaceholder')}
            className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-sprout"
          />

          <label htmlFor="account-phone" className="mt-4 block text-sm font-semibold text-muted">
            <Phone size={13} className="mr-1 inline" />
            {t('account.phone')}
          </label>
          <input
            id="account-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('account.phonePlaceholder')}
            className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-sprout"
          />

          <p className="mt-3 text-xs text-muted">{t('account.optionalHint')}</p>

          <button className="btn-primary mt-4 w-full" onClick={save} disabled={!dirty}>
            {saved ? t('account.saved') : t('account.save')}
          </button>
          {since && <p className="mt-3 text-center text-xs text-muted">{t('account.since', { date: since })}</p>}
          {parentStreak.current > 0 && (
            <p className="mt-1 flex items-center justify-center gap-1 text-center text-xs font-semibold text-gold">
              <Flame size={13} fill="#F0A92E" />
              {t('parentStreak.blurb', { n: parentStreak.current, best: parentStreak.best })}
            </p>
          )}
        </section>

        {/* Sound */}
        <button
          onClick={() => setSoundOn(!soundOn)}
          aria-pressed={soundOn}
          className="card flex w-full items-center gap-3 p-4 text-left"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sprout/10">
            {soundOn ? (
              <Volume2 size={18} className="text-sprout" />
            ) : (
              <VolumeX size={18} className="text-muted" />
            )}
          </span>
          <span className="flex-1 font-semibold">
            {t('account.sound')}
            <span className="block text-xs font-normal text-muted">{t('account.sound.hint')}</span>
          </span>
          <span
            className={`h-6 w-11 shrink-0 rounded-full p-1 transition ${
              soundOn ? 'bg-sprout' : 'bg-line'
            }`}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-white transition ${
                soundOn ? 'translate-x-5' : ''
              }`}
            />
          </span>
        </button>

        {/* Plan */}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
            <Sparkles size={14} /> {t('account.plan')}
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-lg font-extrabold">
                {data.isPlus ? t('account.plan.plus') : t('account.plan.free')}
                {data.isPlus && <PlusBadge />}
              </div>
              <p className="text-sm text-muted">
                {data.isPlus
                  ? plusSince
                    ? t('account.plan.plusSince', { date: plusSince })
                    : t('account.plan.plusBlurb')
                  : t('account.plan.freeBlurb')}
              </p>
            </div>
            <Link to="/parent/upgrade" className={data.isPlus ? 'btn-ghost px-4 py-2 text-sm' : 'btn-gold px-4 py-2 text-sm'}>
              {data.isPlus ? t('account.plan.manage') : t('account.plan.upgrade')}
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted">{t('plus.demoNote')}</p>
        </section>

        {/* Family + language shortcuts */}
        <section className="space-y-2">
          <Link to="/parent/children" className="card flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sprout/10">
              <Users size={18} className="text-sprout" />
            </span>
            <span className="flex-1 font-semibold">{t('account.children')}</span>
            <span className="text-sm text-muted">
              {children.map((c) => c.avatar).join(' ') || t('account.noChildren')}
            </span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
          <Link to="/parent/language" className="card flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sprout/10">
              <Languages size={18} className="text-sprout" />
            </span>
            <span className="flex-1 font-semibold">{t('more.language')}</span>
            <span className="text-sm text-muted">{locale}</span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
        </section>

        {/* Data: where it lives, and how to keep it */}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
            <ShieldCheck size={14} /> {t('account.data')}
          </h2>
          <p className="mt-2 text-sm text-muted">{t('account.data.blurb')}</p>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted">
            <HardDrive size={13} /> {t('account.data.usage', { size: formatBytes(storageBytes()) })}
          </p>

          <button className="btn-ghost mt-4 w-full" onClick={exportBackup}>
            <Download size={16} /> {t('account.backup')}
          </button>
          <button className="btn-ghost mt-2 w-full" onClick={() => fileInput.current?.click()}>
            <Upload size={16} /> {t('account.restore')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label={t('account.restore')}
            onChange={(e) => {
              void pickBackup(e.target.files?.[0])
              // Reset so picking the same file twice still fires a change.
              e.target.value = ''
            }}
          />
          {error && <p className="mt-2 text-center text-xs text-berry">{error}</p>}
          <p className="mt-3 text-xs text-muted">{t('account.backup.hint')}</p>

          {/* The app ships with a demo family. A real one should not have to
              delete Vir and Ira one at a time before they can begin. */}
          <button
            className="btn-ghost mt-4 w-full text-berry"
            onClick={() => setFreshening(true)}
          >
            {t('account.startFresh')}
          </button>
          <p className="mt-1 text-xs text-muted">{t('account.startFresh.hint')}</p>
        </section>

        {/* Installed, this stops looking like a website and starts behaving
            like the app it is: no browser chrome, its own icon, offline. Hidden
            once it already is installed — advice you have taken is clutter. */}
        {!standalone && (
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
              <Smartphone size={14} /> {t('account.install')}
            </h2>
            <p className="mt-2 text-sm text-muted">{t('account.install.blurb')}</p>
            <p className="mt-2 text-xs text-muted">{t('account.install.how')}</p>
          </section>
        )}

        <p className="px-1 text-center text-xs text-muted">{t('account.noLogin')}</p>
      </div>

      <ConfirmSheet
        open={freshening}
        title={t('account.startFresh')}
        body={t('account.startFresh.confirm')}
        confirmLabel={t('account.startFresh.cta')}
        destructive
        onCancel={() => setFreshening(false)}
        onConfirm={() => {
          setFreshening(false)
          startFresh()
          // Onboarding runs again from an empty family: their name, their kids.
          nav('/onboarding')
        }}
      />

      <ConfirmSheet
        open={pending !== null}
        title={t('account.restore.confirmTitle')}
        body={t('account.restore.confirmBody', {
          date: pending ? formatShortDate(pending.exportedAt.slice(0, 10)) : '',
          n: pending?.data.children.length ?? 0,
        })}
        confirmLabel={t('account.restore.confirmCta')}
        destructive
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) restore(pending)
          setPending(null)
        }}
      />
    </div>
  )
}
