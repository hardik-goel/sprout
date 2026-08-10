// P6 — Save / Spend / Give.
//
// Every approved task's points get split across three jars by this percentage.
// Only offered for kids old enough to reason about the trade-off (see ageFit);
// younger kids keep one jar, because three is just confusing at three.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PiggyBank } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { PlusGate } from '@/ui/PlusGate'
import { normalizeSplit, splitPoints, supportsThreeJars } from '@/domain'
import type { JarKind } from '@/domain/types'
import { t } from '@/i18n'

const JARS: JarKind[] = ['save', 'spend', 'give']

export function JarSettings() {
  return (
    <div className="pb-8">
      <PageHeader title={t('jars.title')} subtitle={t('jars.subtitle')} right={<PlusBadge />} />
      <PlusGate feature="threeJars" title={t('jars.gate.title')} blurb={t('jars.gate.blurb')}>
        <JarBody />
      </PlusGate>
    </div>
  )
}

function JarBody() {
  const children = useStore((s) => s.childViews())
  const activeChild = useStore((s) => s.activeChild())
  const setJarSplit = useStore((s) => s.setJarSplit)
  const [childId, setChildId] = useState(activeChild?.id ?? children[0]?.id ?? '')

  const child = children.find((c) => c.id === childId) ?? children[0]
  if (!child) return <p className="px-5 text-muted">{t('common.noChildSelected')}</p>

  const eligible = supportsThreeJars(child.age)
  const preview = splitPoints(20, child.jarSplit)

  /** Move one jar's share and rebalance the others so the split always sums to 100. */
  function setShare(jar: JarKind, value: number) {
    const others = JARS.filter((j) => j !== jar)
    const remainder = 100 - value
    const othersTotal = others.reduce((sum, j) => sum + child.jarSplit[j], 0)
    const next = { ...child.jarSplit, [jar]: value }
    for (const j of others) {
      next[j] = othersTotal === 0 ? Math.round(remainder / 2) : Math.round((child.jarSplit[j] / othersTotal) * remainder)
    }
    setJarSplit(child.id, normalizeSplit(next))
  }

  return (
    <div className="space-y-5 px-5">
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setChildId(c.id)}
              className={`chip border ${
                c.id === child.id ? 'border-sprout bg-sprout/10 text-sprout' : 'border-line bg-white'
              }`}
            >
              {c.avatar} {c.name}
            </button>
          ))}
        </div>
      )}

      {!eligible ? (
        <div className="card p-5 text-sm text-muted">
          {t('jars.tooYoung', { name: child.name, age: child.age })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {JARS.map((jar) => (
              <div key={jar} className="card flex flex-col items-center gap-1 p-4">
                <div className="text-2xl">{t(`jars.${jar}.emoji`)}</div>
                <div className="text-xl font-extrabold text-sprout">{child.jars[jar]}</div>
                <div className="text-[11px] text-muted">{t(`jars.${jar}.label`)}</div>
              </div>
            ))}
          </div>

          <div className="card space-y-4 p-5">
            {JARS.map((jar) => (
              <div key={jar}>
                <label className="flex items-center justify-between text-sm font-semibold">
                  <span>
                    {t(`jars.${jar}.emoji`)} {t(`jars.${jar}.label`)}
                  </span>
                  <span className="text-muted">{child.jarSplit[jar]}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={child.jarSplit[jar]}
                  onChange={(e) => setShare(jar, Number(e.target.value))}
                  className="mt-1 w-full accent-sprout"
                />
              </div>
            ))}
            <p className="text-xs text-muted">
              {t('jars.preview', { save: preview.save, spend: preview.spend, give: preview.give })}
            </p>
          </div>

          <Link to="/kid/jar" className="btn-ghost w-full">
            <PiggyBank size={18} /> {t('jars.seeKidView')}
          </Link>
        </>
      )}
    </div>
  )
}
