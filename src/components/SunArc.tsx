import { PRAYERS, formatCountdown, formatTime, prayerName, type PrayerState } from '../lib/prayer'
import { t } from '../i18n'

/**
 * Sun-path arc: Subax sits at the left end, Cishe at the right end, the other prayers
 * along the arc at their real times, and a glowing sun (or moon at night) marks "now".
 */
export function SunArc({ state, zone, width = 320 }: { state: PrayerState; zone: string; width?: number }) {
  const H = 150, CY = 140, R = Math.min((width - 50) / 2, 136), CX = width / 2
  const arcLen = Math.PI * R
  const span = state.today.isha.getTime() - state.today.fajr.getTime()
  const frac = (d: Date) => Math.min(1, Math.max(0, (d.getTime() - state.today.fajr.getTime()) / span))
  const pos = (f: number) => {
    const a = Math.PI * (1 - f)
    return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) }
  }
  const sun = pos(state.dayFraction)
  const path = `M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`
  const five = PRAYERS.filter((p) => p.isPrayer)

  return (
    <div className="relative" style={{ height: H }}>
      <svg aria-hidden="true" width={width} height={H} viewBox={`0 0 ${width} ${H}`} className="absolute left-0 top-0">
        <path d={path} fill="none" stroke="rgba(233,212,158,0.28)" strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round" />
        <path d={path} fill="none" stroke="#C9A34E" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${(arcLen * state.dayFraction).toFixed(1)} ${arcLen.toFixed(1)}`} />
        <line x1="10" y1={CY} x2={width - 10} y2={CY} stroke="rgba(233,212,158,0.22)" />
        {five.map((p) => {
          const { x, y } = pos(frac(state.today[p.key]))
          const isNext = p.key === state.next.key
          const past = state.today[p.key].getTime() <= Date.now()
          return (
            <circle
              key={p.key}
              cx={x}
              cy={y}
              r={isNext ? 5.5 : 4.5}
              fill={isNext ? '#071F19' : past ? '#C9A34E' : '#0B3328'}
              stroke={isNext ? '#E9D49E' : past ? 'none' : 'rgba(233,212,158,0.55)'}
              strokeWidth={isNext ? 2 : 1.5}
            />
          )
        })}
      </svg>
      <span
        aria-hidden="true"
        className="absolute h-[18px] w-[18px] rounded-full"
        style={{
          left: sun.x - 9,
          top: sun.y - 9,
          background: state.isDaylight
            ? 'radial-gradient(circle, #FFF3C4 0%, #E9C46A 60%, #C9A34E 100%)'
            : 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #DCE6F0 70%)',
          boxShadow: state.isDaylight ? '0 0 18px 6px rgba(233,196,106,0.55)' : '0 0 14px 4px rgba(220,230,240,0.35)',
        }}
      />
      <div className="absolute inset-x-0 top-11 text-center" aria-live="polite">
        <p className="eyebrow m-0 !text-[#C9B47F]">{t('home.nextPrayer')}</p>
        <p className="m-0 mt-0.5 font-serif text-[36px] leading-none font-semibold text-[#FFF8E8]">{prayerName(state.next.key)}</p>
        <p className="mx-auto mt-2 mb-0 inline-flex h-7 items-center gap-2 rounded-full bg-gold px-3 text-[13px] font-extrabold text-night tabular-nums">
          {formatTime(state.next.at, zone)} <span className="opacity-55">·</span> {formatCountdown(state.secondsLeft)}
        </p>
      </div>
    </div>
  )
}
