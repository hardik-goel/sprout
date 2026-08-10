// A1 — the Growth Album.
//
// The verification photos already exist; the chore loop produced them as a side
// effect. Presented in order, they stop being proof and become an archive: the
// first time she brushed alone, the week he started tidying up. Costs the
// parent nothing extra and is the thing they'll show the family.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ImageOff, X } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { photoStore } from '@/lib/photoStore'
import { monthLabel, shortDate } from '@/domain'
import { t } from '@/i18n'

interface AlbumEntry {
  id: string
  title: string
  emoji: string
  date: string
  photo: string
}

export function GrowthAlbum() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())
  const [open, setOpen] = useState<AlbumEntry | null>(null)

  const months = useMemo(() => {
    if (!activeChild) return []
    const entries: AlbumEntry[] = data.tasks
      .filter((task) => task.childId === activeChild.id && task.status === 'approved' && task.photoId)
      .map((task) => ({
        id: task.id,
        title: task.title,
        emoji: task.emoji,
        date: task.date,
        photo: photoStore.url(task.photoId) ?? '',
      }))
      .filter((e) => e.photo)
      .sort((a, b) => b.date.localeCompare(a.date))

    const grouped = new Map<string, AlbumEntry[]>()
    for (const e of entries) {
      const key = e.date.slice(0, 7)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(e)
    }
    return [...grouped.entries()]
  }, [data.tasks, activeChild])

  if (!activeChild) return <p className="px-5 pt-20 text-center text-muted">{t('common.noChildSelected')}</p>

  const total = months.reduce((n, [, items]) => n + items.length, 0)

  return (
    <div className="pb-8">
      <PageHeader
        title={t('album.title')}
        subtitle={t('album.subtitle', { name: activeChild.name, n: total })}
      />

      {total === 0 ? (
        <div className="card mx-5 flex flex-col items-center gap-3 p-8 text-center text-muted">
          <ImageOff size={32} />
          <p className="text-sm">{t('album.empty')}</p>
          <Link to="/parent/tasks" className="btn-primary mt-2">
            {t('insights.assignTasks')}
          </Link>
        </div>
      ) : (
        <div className="space-y-6 px-5">
          {months.map(([month, items]) => (
            <section key={month}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
                <CalendarDays size={14} /> {monthLabel(`${month}-01`)}
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {items.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setOpen(e)}
                    className="relative aspect-square overflow-hidden rounded-2xl border border-line"
                  >
                    <img src={e.photo} alt={e.title} className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white">
                      {e.emoji} {shortDate(e.date)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-5"
          onClick={() => setOpen(null)}
        >
          <button
            className="absolute right-5 top-5 text-white/80"
            aria-label={t('common.close')}
            onClick={() => setOpen(null)}
          >
            <X size={26} />
          </button>
          <img
            src={open.photo}
            alt={open.title}
            className="max-h-[70vh] w-full max-w-[430px] rounded-3xl object-contain"
          />
          <div className="mt-4 text-center text-white">
            <div className="text-lg font-extrabold">
              {open.emoji} {open.title}
            </div>
            <div className="text-sm text-white/60">{shortDate(open.date)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
