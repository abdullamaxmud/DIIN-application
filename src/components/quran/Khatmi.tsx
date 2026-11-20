import { Link } from 'react-router-dom'
import { t } from '../../i18n'
import type { QuranData } from '../../lib/data'
import { juzEnd, juzPages, juzStart } from '../../lib/quran'
import { streak, wirdCount, wirdToday } from '../../lib/khatma'
import { todayISO } from '../../lib/store'
import { useLastRead, useWird } from '../../lib/progress'
import { Ring } from '../Ring'

/** Monthly wird: one juz a day for 30 days, with a ring, streak, today's portion and a 30-day grid. */
export function Khatmi({ q, onOpen }: { q: QuranData; onOpen: (s: number, a: number) => void }) {
  const [done, setDone] = useWird()
  const [last] = useLastRead()
  const today = wirdToday(done)
  const count = wirdCount(done)
  const [pa, pb] = juzPages(q, today)
  const start = juzStart(q, today)
  const toggle = (n: number) => setDone({ ...done, [n]: done[n] ? 0 : todayISO() })

  return (
    <div className="flex flex-col gap-3">
      <section className="night relative flex items-center gap-3.5 overflow-hidden rounded-3xl p-4">
        <Ring value={count} max={30} size={84} stroke={8} track="#1E5A47" label={t('wird.ring', { c: count })}>
          <span className="font-serif text-xl font-semibold">{count}/30</span>
          <span className="text-[11px] text-[#D9E2D6]">{t('quran.juz')}</span>
        </Ring>
        <div className="flex-1">
          <p className="eyebrow m-0 !text-[#D9E2D6]">{t('wird.monthly')}</p>
          <p className="m-0 mt-0.5 font-serif text-lg font-semibold">{count >= 30 ? t('wird.allDone') : t('wird.perDay')}</p>
          <p className="m-0 mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-night">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4 1-6 1-9z" /></svg>
            {t('wird.streak', { n: streak(Object.values(done)) })}
          </p>
        </div>
      </section>

      <section className="card p-4">
        <p className="eyebrow m-0">{t('wird.today', { n: today })}</p>
        <p className="m-0 mt-1 font-serif text-xl font-semibold text-emerald">{t('wird.juzPages', { n: today, a: pa, b: pb })}</p>
        <p className="m-0 mt-1 text-[13px] text-[#4A473C]">
          {t('wird.startAt')}: <strong>{start.label}</strong> → {t('wird.until')} <strong>{juzEnd(q, today)}</strong>
        </p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => onOpen(start.s, start.a)} className="h-11 flex-1 rounded-xl bg-emerald text-sm font-bold text-ivory">{t('wird.readNow')}</button>
          <button
            type="button"
            onClick={() => toggle(today)}
            aria-pressed={!!done[today]}
            className={`h-11 flex-1 rounded-xl text-sm font-bold ${done[today] ? 'bg-[#EEF1E6] text-emerald' : 'border-[1.5px] border-emerald bg-paper text-emerald'}`}
          >
            {done[today] ? t('wird.marked') : t('wird.mark')}
          </button>
        </div>
      </section>

      {last && (
        <button type="button" onClick={() => onOpen(last.s, last.a)} className="card flex min-h-14 items-center gap-3 px-3 py-2 text-left">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#EEF1E6] text-emerald" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold">{t('wird.resume')}</span>
            <span className="block text-xs text-muted">{last.name} {last.a} · {t('quran.page')} {last.page}</span>
          </span>
        </button>
      )}

      <section aria-labelledby="w-grid" className="card p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 id="w-grid" className="m-0 font-serif text-sm font-semibold">{t('wird.grid')}</h2>
          <Link to="/khatmiga" className="text-xs font-bold whitespace-nowrap text-emerald">{t('wird.custom')}</Link>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 30 }, (_, k) => {
            const n = k + 1, on = !!done[n], isToday = n === today
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggle(n)}
                aria-pressed={on}
                aria-label={t('wird.dayLabel', { n }) + (on ? t('wird.doneSuffix') : '')}
                className={`h-11 rounded-[10px] text-[13px] font-bold ${on ? 'bg-emerald text-ivory' : isToday ? 'border-2 border-gold bg-[#FBF5E2]' : 'border border-hair bg-paper text-[#4A473C]'}`}
              >
                {n}
              </button>
            )
          })}
        </div>
        <p className="m-0 mt-2.5 text-xs text-muted">{t('wird.gridHint')}</p>
      </section>
    </div>
  )
}
