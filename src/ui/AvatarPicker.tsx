import { t } from '@/i18n'

const AVATARS = ['🦖', '🦄', '🐯', '🐰', '🦊', '🐨', '🐸', '🐥', '🦁', '🐼', '🦋', '🐙']

export function AvatarPicker({ value, onChange }: { value: string; onChange: (a: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {AVATARS.map((a) => (
        <button
          key={a}
          onClick={() => onChange(a)}
          className={`flex aspect-square items-center justify-center rounded-2xl text-2xl transition ${
            value === a ? 'bg-sprout/15 ring-2 ring-sprout' : 'bg-white border border-line'
          }`}
          aria-label={t('child.avatar.aria', { emoji: a })}
          aria-pressed={value === a}
        >
          {a}
        </button>
      ))}
    </div>
  )
}

export { AVATARS }
