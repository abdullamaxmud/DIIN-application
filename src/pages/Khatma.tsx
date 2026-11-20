import { useState } from 'react'
import { Link } from 'react-router-dom'
import { t, tList } from '../i18n'
import { useQuran } from '../lib/useData'
import { todayISO, useStored } from '../lib/store'
import {
  PRESETS, currentDay, dailyAmount, dayRange, elapsedDays, isBehind, isFinished, juzOfPage, markDay,
  newPlan, pageEnd, pageStart, redistribute, streak, type Plan,
} from '../lib/khatma'
import { Ring } from '../components/Ring'
import { ChevronLeftIcon } from '../components/Icons'

const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${tList('date.months')[m - 1]} ${y}`
}
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export default function Khatma() {
  const { data: q } = useQuran()
  const [plan, setPlan] = useStored<Plan>('khatma.plan', newPlan(30))
  const [pending, setPending] = useState<number | null>(null)
  const [custom, setCustom] = useState(false)
  const [showHist, setShowHist] = useState(false)
  const [msg, setMsg] = useState('')

  const days = pending ?? plan.days
  const isCustom = custom || !PRESETS.includes(days)
  const amount = dailyAmount(days)
  const cur = currentDay(plan)
  const finished = isFinished(plan)
  const doneDays = Object.values(plan.done).filter(Boolean).length
  const [ta, tb] = dayRange(plan, cur)
  const remainingPages = 604 - ta + 1
  const remainingDays = Math.max(1, plan.days - elapsedDays(plan) + 1)

  const mark = (i: number) =>
    setPlan(markDay(plan, i, new Date(), (p) => `${p.days} ${t('khatma.days')} · ${dateLabel(p.start)} – ${dateLabel(todayISO())}`))

  const pill = (on: boolean) => `h-11 rounded-xl text-sm font-bold ${on ? 'bg-emerald text-ivory' : 'border border-hair bg-paper text-ink'}`
  const step = 'h-10 w-10 rounded-[10px] border border-hair bg-ivory text-base font-extrabold'

  return (
    <>
      <header className="flex items-center gap-2 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-2">
        <Link to="/quraanka" aria-label={t('common.back')} className="flex h-11 w-11 items-center justify-center rounded-xl text-ink"><ChevronLeftIcon size={22} /></Link>
        <h1 className="m-0 flex-1 truncate font-serif text-lg font-semibold">{t("pages.khatma")}</h1>
        <button type="button" onClick={() => setShowHist(!showHist)} aria-expanded={showHist} className="h-10 rounded-[10px] px-3 text-[13px] font-bold text-emerald">{t('khatma.history')}</button>
      </header>

      <main className="flex flex-col gap-2.5 px-4">
        {showHist && (
          <div role="status" className="card px-3.5 py-3 text-[13px] leading-normal">
            <strong>{t('khatma.historyTitle')}</strong>
            {plan.history.length ? plan.history.map((h, k) => <p key={k} className="m-0 mt-1">✓ {h}</p>) : <p className="m-0 mt-1">{t('khatma.noHistory')}</p>}
          </div>
        )}

        <section className="night flex items-center gap-4 rounded-3xl p-4">
          <Ring value={doneDays} max={plan.days} size={96} stroke={9} track="#1E4A3C" label={`${doneDays}/${plan.days}`}>
            <span className="font-serif text-xl font-semibold">{doneDays}/{plan.days}</span>
            <span className="text-[11px] text-mist">{t('khatma.days')}</span>
          </Ring>
          <div>
            <p className="m-0 font-serif text-base font-semibold">{t('khatma.plan', { n: plan.days })}</p>
            <p className="m-0 mt-1 text-xs text-mist">{t('khatma.started', { date: dateLabel(plan.start) })}</p>
            <p className="m-0 mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-night">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4 1-6 1-9z" /></svg>
              {t('wird.streak', { n: streak(Object.values(plan.done)) })}
            </p>
          </div>
        </section>

        <section aria-labelledby="k-len" className="card px-4 py-3.5">
          <h2 id="k-len" className="m-0 mb-2.5 text-[13px] font-bold text-muted">{t('khatma.length')}</h2>
          <div role="radiogroup" aria-labelledby="k-len" className="grid grid-cols-6 gap-1.5">
            {PRESETS.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={!isCustom && days === n} onClick={() => { setCustom(false); setPending(n) }} className={pill(!isCustom && days === n)}>{n}</button>
            ))}
            <button type="button" role="radio" aria-checked={isCustom} onClick={() => { setCustom(true); if (PRESETS.includes(days)) setPending(45) }} className={pill(isCustom)}>{t('khatma.custom')}</button>
          </div>
          {isCustom && (
            <div className="mt-2.5 flex items-center gap-2">
              <label htmlFor="kdays" className="text-[13px] text-[#4A473C]">{t('khatma.customDays')}</label>
              <button type="button" onClick={() => setPending(Math.max(1, days - 1))} aria-label={t('khatma.minus')} className={step}>−</button>
              <input
                id="kdays"
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                value={days}
                onChange={(e) => { const n = parseInt(e.target.value, 10); if (n >= 1 && n <= 365) setPending(n) }}
                className="h-10 w-16 rounded-[10px] border border-hair text-center text-base font-extrabold"
              />
              <button type="button" onClick={() => setPending(Math.min(365, days + 1))} aria-label={t('khatma.plus')} className={step}>+</button>
            </div>
          )}
          <p className="m-0 mt-2.5 text-xs text-muted">{t('khatma.perDay', amount)}</p>
          {days !== plan.days && (
            <button type="button" onClick={() => { setPlan(newPlan(days, todayISO(), plan.remind, plan.history)); setPending(null); setMsg('') }} className="mt-2.5 h-11 w-full rounded-xl bg-emerald text-sm font-extrabold text-ivory">
              {t('khatma.startNew', { n: days })}
            </button>
          )}
        </section>

        <section aria-label={t('khatma.reminder')} className="card flex flex-col gap-2.5 px-4 py-3">
          <div className="flex items-center justify-between">
            <div><p className="m-0 text-sm font-bold">{t('khatma.reminder')}</p><p className="m-0 text-xs text-muted">{t('khatma.everyDay')}</p></div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPlan({ ...plan, remind: (plan.remind + 1425) % 1440 })} aria-label={t('khatma.earlier')} className={step}>−</button>
              <span className="min-w-14 text-center text-base font-extrabold tabular-nums">{hhmm(plan.remind)}</span>
              <button type="button" onClick={() => setPlan({ ...plan, remind: (plan.remind + 15) % 1440 })} aria-label={t('khatma.later')} className={step}>+</button>
            </div>
          </div>
          {q && (
            <div aria-label="Muuqaalka ogeysiiska" className="flex gap-2.5 rounded-2xl bg-ivory p-2.5">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-emerald text-[9px] font-extrabold tracking-widest text-gold">DIIN</span>
              <p className="m-0 text-xs leading-normal">{t('khatma.notifText', { juz: juzOfPage(q, ta), a: ta, b: tb })}</p>
            </div>
          )}
        </section>

        {finished && (
          <section role="status" className="rounded-[18px] border border-[#EADBA6] bg-[#FBF5E2] p-4 text-center">
            <p className="m-0 font-serif text-xl font-semibold text-emerald">{t('khatma.finished')}</p>
            <button type="button" onClick={() => setPlan(newPlan(plan.days, todayISO(), plan.remind, plan.history))} className="mt-3 h-11 rounded-xl bg-emerald px-4 text-sm font-extrabold text-ivory">{t('khatma.newKhatma')}</button>
          </section>
        )}

        {q && (
          <ol aria-label="Qaybaha maalinlaha" className="card m-0 list-none p-1">
            {[cur - 1, cur, cur + 1].filter((i) => i >= 1 && i <= plan.days).map((i) => {
              const [a, b] = dayRange(plan, i)
              const isDone = !!plan.done[i], isCur = i === cur
              const ja = juzOfPage(q, a), jb = juzOfPage(q, b)
              return (
                <li key={i} className={`flex items-center gap-3 px-3.5 py-2 ${isCur ? 'rounded-xl bg-[#FBF5E2]' : ''}`}>
                  <span aria-hidden="true" className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-extrabold ${isDone ? 'bg-emerald text-ivory' : isCur ? 'border-2 border-gold' : 'border-2 border-hair text-muted'}`}>{isDone ? '✓' : i}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold">{isCur ? t('khatma.todayPrefix') : ''}{t('khatma.dayTitle', { i, j: ja === jb ? ja : `${ja}–${jb}` })}</span>
                    <span className="block text-xs text-muted">{t('khatma.pages', { a, b, from: pageStart(q, a), to: pageEnd(q, b) })}</span>
                  </span>
                  {(isCur || isDone) && (
                    <button type="button" onClick={() => mark(i)} aria-pressed={isDone} className={`h-9 rounded-full px-3 text-xs font-bold ${isDone ? 'border border-hair bg-paper text-[#4A473C]' : 'bg-emerald text-ivory'}`}>
                      {isDone ? t('khatma.undo') : t('wird.mark')}
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        {isBehind(plan) && (
          <button
            type="button"
            onClick={() => {
              const re = redistribute(plan)
              setPlan(re)
              setMsg(t('khatma.redistributed', { from: re.from, days: re.days, per: Math.ceil(remainingPages / re.days) }))
            }}
            className="min-h-12 rounded-[14px] border-[1.5px] border-dashed border-[#D6C69C] text-[13px] font-bold text-emerald"
          >
            {t('khatma.behind', { pages: remainingPages, days: remainingDays })}
          </button>
        )}
        {msg && <p role="status" className="m-0 rounded-xl bg-[#EEF1E6] px-3 py-2.5 text-xs leading-normal text-emerald">{msg}</p>}
        <p className="m-0 mb-2 text-xs text-muted">{t('khatma.note')}</p>
      </main>
    </>
  )
}
