// The parent world's door. Stands between a child holding the phone and the
// screen where points are awarded, rewards are priced and tasks are assigned.

import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { PinPad } from '@/ui/PinPad'
import { t } from '@/i18n'

export function ParentLock() {
  const nav = useNavigate()
  const unlockParent = useStore((s) => s.unlockParent)

  return (
    <div className="flex min-h-screen flex-col justify-center bg-paper">
      <PinPad
        title={t('pin.parent.title')}
        subtitle={t('pin.parent.subtitle')}
        onSubmit={unlockParent}
        onCancel={() => nav('/kid')}
        cancelLabel={t('pin.parent.backToKid')}
      />
    </div>
  )
}
