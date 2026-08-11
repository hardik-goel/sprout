import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Gift, PartyPopper } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { formatShortDate } from '@/i18n/format'
import { t } from '@/i18n'

export function RewardFulfil() {
  const { rewardId } = useParams()
  const nav = useNavigate()
  const reward = useStore((s) => s.data.rewards.find((r) => r.id === rewardId))
  const fulfillReward = useStore((s) => s.fulfillReward)

  if (!reward) {
    return (
      <div className="px-5 pt-20 text-center text-muted">
        {t('fulfil.notFound')}{' '}
        <Link to="/parent/rewards" className="text-sprout font-semibold">
          {t('nav.rewards')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col pb-10">
      <PageHeader title={t('fulfil.title')} back="/parent/rewards" />
      <div className="flex flex-1 flex-col items-center px-5 text-center">
        <div className="mt-4 text-7xl">{reward.emoji}</div>
        <h2 className="mt-3 text-2xl font-extrabold">{reward.title}</h2>
        <p className="text-muted">{t('common.pts', { n: reward.cost })}</p>

        {reward.redeemed ? (
          <div className="mt-6 flex items-center gap-2 rounded-full bg-gold/15 px-4 py-2 font-bold text-gold">
            <PartyPopper size={18} /> {t('fulfil.redeemed')} {reward.redeemedAt ? `· ${formatShortDate(reward.redeemedAt.slice(0, 10))}` : ''}
          </div>
        ) : (
          <div className="mt-6 rounded-full bg-line px-4 py-2 text-sm text-muted">
            {t('fulfil.notRedeemed')}
          </div>
        )}

        <div className="mt-8 w-full max-w-xs space-y-2">
          {reward.redeemed && !reward.fulfilled && (
            <button
              className="btn-gold w-full"
              onClick={() => {
                fulfillReward(reward.id)
              }}
            >
              <Gift size={18} /> {t('fulfil.markGiven')}
            </button>
          )}
          {reward.fulfilled && (
            <div className="flex items-center justify-center gap-2 rounded-full bg-sprout/15 py-3 font-bold text-sprout">
              <Check size={18} /> {t('fulfil.given')}
            </div>
          )}
          <button className="btn-ghost w-full" onClick={() => nav('/parent')}>
            {t('approve.backHome')}
          </button>
        </div>
      </div>
    </div>
  )
}
