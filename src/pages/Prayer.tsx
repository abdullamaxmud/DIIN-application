import { Link } from 'react-router-dom'
import { t, tList } from '../i18n'
import { useNotifyPrefs, type FivePrayers } from '../lib/push'
import { useLocation } from '../lib/location'
import { usePrayer } from '../lib/usePrayer'
import { PRAYERS, formatTime, type PrayerKey } from '../lib/prayer'
import { formatGregorian, formatHijri } from '../lib/dates'
import { compassPoint, distanceToKaaba, qiblaBearing } from '../lib/qibla'
import { useWidth } from '../lib/useWidth'
import { StarPattern } from '../components/StarPattern'
import { LocationGate } from '../components/LocationGate'
import { SunArc } from '../components/SunArc'
import { BellIcon, ChevronRightIcon, PinIcon } from '../components/Icons'

export default function Prayer() {
  const { fix, status, request } = useLocation()
  const state = usePrayer()
  const [arcRef, arcWidth] = useWidth<HTMLDivElement>()
  // the bells are the same switches as on the notifications screen (one source of truth)
  const [prefs, setPrefs] = useNotifyPrefs()

  if (!fix || !state) {
    return (
      <div className="night relative min-h-dvh overflow-hidden px-[22px] pt-10 pb-32">
        <StarPattern opacity={0.12} />
        <div className="relative"><LocationGate /></div>
      </div>
    )
  }

  const isOn = (key: PrayerKey) => key !== 'sunrise' && !!prefs.prayers[key as FivePrayers]
  const toggle = (key: PrayerKey) => {
    if (key === 'sunrise') return
    setPrefs({ ...prefs, prayers: { ...prefs.prayers, [key]: !isOn(key) } })
  }
  const now = new Date()
  const qibla = qiblaBearing(fix.lat, fix.lng)

  return (
    <>
      <header className="night relative overflow-hidden rounded-b-[32px] px-4 pt-[max(18px,env(safe-area-inset-top))] pb-4">
        <StarPattern opacity={0.1} />
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <PinIcon size={18} className="flex-none text-gold-soft" />
            <span className="min-w-0">
              <span className="block truncate font-serif text-lg font-semibold">{state.region.country}</span>
              <span className="block text-xs text-mist">
                {status === 'searching' ? t('prayer.searching') : 'GPS'} · {fix.lat.toFixed(2)}°, {fix.lng.toFixed(2)}°
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={request}
            aria-label={t('prayer.refresh')}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gold text-night"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
        </div>
        <p className="relative m-0 mt-2.5 text-xs text-[#C9D6CC]">
          {formatGregorian(now)} · {formatHijri(now, fix.zone)}
        </p>
        <div ref={arcRef} className="relative mt-1.5">
          <SunArc state={state} zone={fix.zone} width={arcWidth} />
        </div>
      </header>

      <main className="flex flex-col gap-2.5 px-4 pt-3">
        <Link to="/qiblada" className="night relative flex min-h-[64px] items-center gap-3 overflow-hidden rounded-[20px] px-3.5 py-2.5 no-underline">
          <StarPattern opacity={0.08} size={40} />
          <span className="relative flex h-11 w-11 flex-none items-center justify-center rounded-[14px] border border-gold/45 bg-gold/15 text-gold-soft" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" /></svg>
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block font-serif text-[17px] leading-tight font-semibold text-ivory">{t('qibla.card')}</span>
            <span className="mt-0.5 block truncate text-xs font-bold text-mist tabular-nums">
              {t('qibla.cardSub', { deg: Math.round(qibla) % 360, point: tList('qibla.points')[compassPoint(qibla)], km: Math.round(distanceToKaaba(fix.lat, fix.lng)).toLocaleString('en-US') })}
            </span>
          </span>
          <span aria-hidden="true" className="relative flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gold text-night"><ChevronRightIcon /></span>
        </Link>
        <ul className="card m-0 list-none p-1">
          {PRAYERS.map((p) => {
            const on = isOn(p.key)
            const isNext = p.key === state.next.key && state.next.at.getTime() === state.today[p.key].getTime()
            return (
              <li
                key={p.key}
                className={`flex items-center gap-3 rounded-2xl py-1.5 pr-2.5 pl-3.5 ${isNext ? 'bg-[#EEF1E6] outline outline-[1.5px] outline-emerald' : ''}`}
              >
                <span className="flex flex-1 flex-col">
                  <span className="text-[15px] font-bold">{p.so}</span>
                  <span lang="ar" dir="rtl" className="text-left text-xs text-muted">{p.ar}</span>
                </span>
                <span className="text-lg font-extrabold tabular-nums">{formatTime(state.today[p.key], fix.zone)}</span>
                {p.isPrayer ? (
                  <button
                    type="button"
                    onClick={() => toggle(p.key)}
                    aria-pressed={on}
                    aria-label={t(on ? 'prayer.bellOn' : 'prayer.bellOff', { name: p.so })}
                    className={`flex h-11 w-11 items-center justify-center ${on ? 'text-emerald' : 'text-[#9C988A]'}`}
                  >
                    <BellIcon size={20} fill={on ? 'currentColor' : 'none'} />
                  </button>
                ) : (
                  <span className="h-11 w-11" aria-hidden="true" />
                )}
              </li>
            )
          })}
        </ul>
        <div className="card flex items-start gap-2.5 px-3.5 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D3B2E" strokeWidth="2.2" strokeLinecap="round" className="mt-0.5 flex-none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v.01M11 12h1v5h1" />
          </svg>
          <p className="m-0 text-xs leading-relaxed text-[#4A473C]">
            {t('prayer.methodNote', {
              method: state.region.methodName,
              madhab: t(state.region.hanafi ? 'prayer.madhabHanafi' : 'prayer.madhabJumhur'),
            })}{' '}
            {t('prayer.source')}
          </p>
        </div>
      </main>
    </>
  )
}
