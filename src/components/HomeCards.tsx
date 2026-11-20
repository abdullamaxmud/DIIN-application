import { Link } from 'react-router-dom'
import { t } from '../i18n'
import { useLastRead, useWird } from '../lib/progress'
import { useQuran } from '../lib/useData'
import { wirdCount, wirdToday } from '../lib/khatma'
import { juzEnd, juzPages, juzStart } from '../lib/quran'
import { CATEGORY_SO } from '../lib/adhkar'
import { usePrayer } from '../lib/usePrayer'
import { useLocation } from '../lib/location'
import { formatMinSec, formatTime, prayerName, prayerSoon } from '../lib/prayer'
import { useAdhkarTime, useDoneToday } from '../lib/adhkarProgress'
import { Ring } from './Ring'
import { StarPattern } from './StarPattern'
import { ChevronRightIcon, MoonIcon, MosqueIcon } from './Icons'

export function ContinueReadingCard() {
  const [last] = useLastRead()
  if (!last) return null
  const pct = Math.round((last.page / 604) * 100)
  return (
    <Link
      to={`/quraanka?tab=akhri&s=${last.s}&a=${last.a}`}
      aria-label={`${t('home.continueReading')}: ${last.name} ${last.a}, ${t('quran.page')} ${last.page}. ${604 - last.page} bog ayaa haray.`}
      className="card flex items-center gap-3.5 p-3.5 text-ink no-underline"
    >
      <span aria-hidden="true" className="relative flex h-[74px] w-[58px] flex-none items-center justify-center rounded-[10px_10px_8px_8px] bg-gradient-to-br from-[#15513F] to-night shadow-[0_10px_18px_-10px_rgba(7,31,25,0.8)]">
        <span className="absolute inset-[5px] rounded-md border border-gold/70" />
        <span className="absolute inset-[9px] rounded border border-gold/35" />
        <svg width="26" height="26" viewBox="0 0 48 48"><g fill="#C9A34E"><rect x="13" y="13" width="22" height="22" /><rect x="13" y="13" width="22" height="22" transform="rotate(45 24 24)" /></g><circle cx="24" cy="24" r="5" fill="#0B3328" /></svg>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="eyebrow">{t('home.continueReading')}</span>
        <span className="font-serif text-lg leading-tight font-semibold text-emerald">{last.name} <span className="font-sans text-[13px] font-bold text-umber">aayadda {last.a}</span></span>
        <span className="text-[12.5px] text-muted"><span lang="ar" dir="rtl" className="font-arabic text-[15px] text-emerald">{last.ar}</span> · {t('quran.page')} {last.page} / 604</span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-sand"><span className="block h-[5px] rounded-full bg-gradient-to-r from-gold to-gold-soft" style={{ width: `${pct}%` }} /></span>
          <span className="text-xs font-extrabold whitespace-nowrap text-umber">{pct}% · {604 - last.page} bog</span>
        </span>
      </span>
      <span aria-hidden="true" className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-emerald text-gold-soft"><ChevronRightIcon /></span>
    </Link>
  )
}

export function WirdCard() {
  const { data: q } = useQuran()
  const [done] = useWird()
  const c = wirdCount(done)
  const n = wirdToday(done)
  const all = c >= 30
  return (
    <section aria-label={t('home.wirdToday')} className="card flex items-center gap-4 p-4">
      <Ring value={c} max={30} size={74} fill="#FBF6EA" label={t('wird.ring', { c })}>
        <span className="font-serif text-[17px] font-semibold text-emerald">{c}<span className="text-xs text-umber">/30</span></span>
      </Ring>
      <div className="min-w-0 flex-1">
        <p className="eyebrow m-0">{t('home.wirdToday')}</p>
        {q ? (
          <>
            <p className="m-0 mt-1 font-serif text-[19px] font-semibold text-emerald">{all ? t('wird.allDone') : t('wird.juzPages', { n, a: juzPages(q, n)[0], b: juzPages(q, n)[1] })}</p>
            <p className="m-0 mt-0.5 text-[12.5px] text-muted">{all ? t('wird.allDoneSub') : `${juzStart(q, n).label} → ${juzEnd(q, n)}`}</p>
          </>
        ) : <p className="m-0 mt-1 text-sm text-muted">…</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {q && !all && (
            <Link to={`/quraanka?tab=akhri&s=${juzStart(q, n).s}&a=${juzStart(q, n).a}`} className="inline-flex h-9 items-center rounded-full bg-emerald px-3.5 text-[13px] font-extrabold whitespace-nowrap text-ivory no-underline">{t('home.startReading')}</Link>
          )}
          <Link to="/khatmiga" className="text-[13px] font-bold whitespace-nowrap text-gold-ink">{t('home.customPlan')}</Link>
        </div>
      </div>
    </section>
  )
}

/** Shown on Home only in the last 5 minutes before a prayer. */
export function PrayerSoonCard() {
  const { fix } = useLocation()
  const state = usePrayer()
  const soon = state && fix ? prayerSoon(state) : null
  if (!soon || !fix) return null
  const name = prayerName(soon.key)
  return (
    <Link
      to="/salaadda"
      role="status"
      aria-live="polite"
      className="flex items-center gap-3.5 rounded-3xl border border-gold/60 bg-gradient-to-br from-[#FBF0CF] to-[#F3E1A8] p-4 text-night no-underline shadow-[0_14px_28px_-18px_rgba(138,106,31,0.9)]"
    >
      <span className="relative flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[18px] bg-emerald text-gold-soft">
        <MosqueIcon size={26} />
        <span aria-hidden="true" className="absolute -top-1 -right-1 h-3.5 w-3.5 animate-ping rounded-full bg-gold" />
        <span aria-hidden="true" className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#FBF0CF] bg-gold" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[19px] leading-tight font-semibold text-emerald">{t('home.prayerSoon', { name })}</span>
        <span className="mt-1 block text-[13px] font-bold text-gold-ink tabular-nums">
          {t('home.prayerSoonSub', { left: formatMinSec(soon.secondsLeft), time: formatTime(soon.at, fix.zone) })}
        </span>
      </span>
      <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-emerald text-gold-soft"><ChevronRightIcon /></span>
    </Link>
  )
}

export function AdhkarCard() {
  const { cats } = useDoneToday()
  // morning from Fajr until Asr, evening from Asr until Fajr (real prayer times when GPS is on)
  const key = useAdhkarTime()
  const evening = key === 'fiid'
  return (
    <Link to={`/adkaarta/${key}`} className="relative flex items-center gap-3.5 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald to-night p-[18px] text-ivory no-underline shadow-[0_16px_30px_-18px_rgba(7,31,25,0.9)]">
      <StarPattern opacity={0.08} size={40} />
      <span className="relative flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[18px] border border-gold/45 bg-gold/15 text-gold-soft">
        {evening ? <MoonIcon size={26} fill="currentColor" /> : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        )}
      </span>
      <span className="relative flex-1">
        <span className="eyebrow block !text-[#C9B47F]">Xisnul Muslim</span>
        <span className="mt-0.5 block font-serif text-xl font-semibold">{t('home.adhkarRead', { name: CATEGORY_SO[key] })}</span>
        <span className="block text-[12.5px] text-mist">{cats[key] ? t('home.adhkarDoneAgain') : t(`home.adhkarNow.${key}`)}</span>
      </span>
      <span aria-hidden="true" className="relative flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gold text-night"><ChevronRightIcon /></span>
    </Link>
  )
}
