// Saving jar — fill level animates toward the target percentage.
export function JarVisual({
  pct,
  size = 'md',
  label,
}: {
  pct: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
}) {
  const dims = size === 'lg' ? 'w-40 h-52' : size === 'sm' ? 'w-16 h-20' : 'w-28 h-36'
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${dims}`}>
        {/* jar body */}
        <div className="absolute inset-0 rounded-b-[28px] rounded-t-2xl border-4 border-white/70 bg-white/10 overflow-hidden backdrop-blur-sm">
          {/* fill */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-glow to-sprout transition-[height] duration-700 ease-out"
            style={{ height: `${clamped}%` }}
          >
            <div className="absolute inset-x-0 top-0 h-2 bg-white/30" />
          </div>
          {/* coins hint */}
          <div className="absolute inset-0 flex items-end justify-center pb-2 text-2xl opacity-80">
            🪙
          </div>
        </div>
        {/* lid */}
        <div className="absolute -top-2 left-1/2 h-3 w-[60%] -translate-x-1/2 rounded-full bg-white/80" />
      </div>
      <div className="text-center">
        <div className="text-lg font-extrabold">{clamped}%</div>
        {label && <div className="text-xs opacity-70">{label}</div>}
      </div>
    </div>
  )
}
