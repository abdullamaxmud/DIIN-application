import { Link } from 'react-router-dom'
import { t } from '../i18n'
import { useLocation } from '../lib/location'
import { usePrayer } from '../lib/usePrayer'
import { PRAYERS, formatTime } from '../lib/prayer'
import { useWidth } from '../lib/useWidth'
import { SunArc } from './SunArc'
import { PinIcon } from './Icons'

/** Mihrab-arch window on Home: live sun-path + five prayers, or the "allow location" prompt. */
export function HomePrayerArch() {
  const { fix, status, request } = useLocation()
  const state = usePrayer()
  const [ref, width] = useWidth<HTMLDivElement>()

  return (
    <section
      aria-label={t('home.nextPrayer')}
      className="relative mt-5 rounded-[170px_170px_26px_26px] border border-gold/35 bg-gradient-to-b from-gold-soft/10 to-gold-soft/[0.03] px-4 pt-6 pb-4"
    >
      <div ref={ref}>
        {fix && state ? (
          <Link to="/salaadda" className="block text-inherit no-underline">
            <SunArc state={state} zone={fix.zone} width={width} />
            <div className="mt-2.5 grid grid-cols-5 gap-1 text-center">
              {PRAYERS.filter((p) => p.isPrayer).map((p) => {
                const on = p.key === state.next.key
                return (
                  <div key={p.key} className={`rounded-2xl py-1.5 ${on ? 'bg-gold' : 'bg-ivory/[0.06]'}`}>
                    <p className={`m-0 text-[10.5px] font-bold tracking-wide ${on ? 'text-[#3B2E0B]' : 'text-[#AFC4B8]'}`}>{p.so}</p>
                    <p className={`m-0 mt-px text-[13.5px] font-extrabold tabular-nums ${on ? 'text-night' : 'text-ivory'}`}>{formatTime(state.today[p.key], fix.zone)}</p>
                  </div>
                )
              })}
            </div>
          </Link>
        ) : (
          <div className="flex flex-col items-center gap-2.5 px-1.5 pt-2 text-center">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-gold shadow-[0_0_0_10px_rgba(201,163,78,0.14)]">
              <PinIcon size={26} className="text-night" />
            </span>
            <p className="m-0 mt-1.5 max-w-[270px] font-serif text-[19px] leading-snug font-semibold">{t('home.locationPrompt')}</p>
            {status !== 'unsupported' && (
              <button
                type="button"
                onClick={request}
                disabled={status === 'searching'}
                className="mt-1 h-12 w-full rounded-2xl bg-gold text-sm font-extrabold text-night disabled:opacity-70"
              >
                {status === 'searching' ? t('prayer.searching') : status === 'denied' ? t('prayer.retry') : t('home.allowLocation')}
              </button>
            )}
            {(status === 'denied' || status === 'unsupported') && (
              <p role="status" className="m-0 text-xs leading-relaxed text-[#F2C9A8]">
                {status === 'unsupported' ? t('prayer.unsupported') : `${t('prayer.notOn')}. `}
                {status === 'denied' && <Link to="/salaadda" className="font-bold text-gold-soft underline">{t('prayer.android')} / {t('prayer.iphone')} →</Link>}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
