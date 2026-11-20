import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { t } from '../i18n'
import { useHisnChapter, useHisnIndex } from '../lib/useData'
import { chapterIdFor, itemsInChapter, titleFor } from '../lib/adhkar'
import { useStored } from '../lib/store'
import { useDoneToday } from '../lib/adhkarProgress'
import { StarPattern } from '../components/StarPattern'

const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p) } catch { /* not supported */ } }

/** One dhikr at a time: read it, tap the bead ring the prescribed number of times, then move on. */
export default function AdhkarSession() {
  const { key = 'subax' } = useParams()
  const { data: h } = useHisnIndex()
  const { data: chapter, error: chapterError } = useHisnChapter(chapterIdFor(key))
  const { mark } = useDoneToday()
  const [i, setI] = useState(0)
  const [count, setCount] = useState(0)
  const [showMeaning, setShowMeaning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [fs, setFs] = useStored<number>('adhkar.fontSize', 24)
  const timer = useRef<number | undefined>(undefined)
  const meaningRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => { setI(0); setCount(0); setFinished(false); setShowMeaning(false) }, [key])

  if (!h) return <p role="status" className="m-0 py-16 text-center text-sm text-muted">{t('common.loading')}</p>
  if (chapterError) return <Navigate to="/adkaarta" replace />
  if (!chapter) return <p role="status" className="m-0 py-16 text-center text-sm text-muted">{t('common.loading')}</p>
  const items = itemsInChapter(chapter.items, key)
  if (!items.length) return <Navigate to="/adkaarta" replace />
  const title = titleFor(h, key)

  if (finished) {
    const reps = items.reduce((sum, d) => sum + d.c, 0)
    return (
      <div className="night relative flex min-h-[calc(100dvh-90px)] flex-col items-center justify-center overflow-hidden p-6">
        <StarPattern opacity={0.16} />
        <section role="status" className="relative w-full rounded-[26px] bg-paper px-5 pt-7 pb-5 text-center text-ink shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <span className="mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-full bg-gold shadow-[0_0_0_12px_rgba(212,175,55,0.2)]">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#071F19" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
          </span>
          <h1 className="m-0 mt-5 font-serif text-[28px] font-semibold text-emerald">{t('adhkar.congrats')}</h1>
          <p className="m-0 mt-1.5 text-base leading-normal">{t('adhkar.youFinished')}<br /><strong className="text-emerald">{title}</strong></p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-ivory py-3"><p className="m-0 font-serif text-2xl font-semibold text-emerald">{items.length}</p><p className="m-0 text-xs text-muted">{t('adhkar.itemsLabel')}</p></div>
            <div className="rounded-2xl bg-ivory py-3"><p className="m-0 font-serif text-2xl font-semibold text-emerald">{reps}</p><p className="m-0 text-xs text-muted">{t('adhkar.repsLabel')}</p></div>
          </div>
          <p className="m-0 mt-3.5 text-[13px] text-[#4A473C]">{t('adhkar.accept')}</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/adkaarta" className="flex h-[50px] items-center justify-center rounded-2xl bg-emerald font-extrabold text-ivory no-underline">{t('adhkar.backToList')}</Link>
            <button type="button" onClick={() => { setI(0); setCount(0); setFinished(false) }} className="h-11 rounded-2xl border border-hair font-bold text-emerald">{t('adhkar.again')}</button>
          </div>
        </section>
      </div>
    )
  }

  const it = items[Math.min(i, items.length - 1)]
  const reached = count >= it.c
  const last = i + 1 >= items.length

  const goNext = () => {
    window.clearTimeout(timer.current)
    if (last) { vibrate([40, 60, 40]); mark(key); setFinished(true) }
    else { setI(i + 1); setCount(0); setShowMeaning(false) }
  }
  const tap = () => {
    if (reached) return
    const n = count + 1
    vibrate(n >= it.c ? [25, 40, 25] : 12)
    setCount(n)
    if (n >= it.c) timer.current = window.setTimeout(goNext, 650)
  }
  const toggleMeaning = () => {
    setShowMeaning(!showMeaning)
    if (!showMeaning) window.setTimeout(() => meaningRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
  }

  const circ = 465
  const beads = 33
  const lit = Math.round((beads * Math.min(count, it.c)) / it.c)

  return (
    <div className="flex h-[calc(100dvh-90px)] min-h-[600px] flex-col">
      <header className="night relative overflow-hidden px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3">
        <StarPattern opacity={0.1} />
        <div className="relative flex items-center gap-2">
          <Link to="/adkaarta" aria-label={t('adhkar.exit')} className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#11463A] text-ivory">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate font-serif text-base font-semibold">{title}</p>
            <p className="m-0 text-xs text-mist">{t('adhkar.progress', { i: i + 1, n: items.length })}</p>
          </div>
          <button type="button" onClick={() => setFs(Math.max(18, fs - 2))} aria-label={t('quran.fontDown')} className="h-10 w-10 rounded-[10px] border border-[#3F6656] text-xs font-bold">A−</button>
          <button type="button" onClick={() => setFs(Math.min(38, fs + 2))} aria-label={t('quran.fontUp')} className="h-10 w-10 rounded-[10px] border border-[#3F6656] text-[15px] font-bold">A+</button>
        </div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={i + 1} className="relative mt-3 h-1.5 rounded-full bg-[#1E4A3C]">
          <div className="h-1.5 rounded-full bg-gold transition-[width] duration-300" style={{ width: `${((i + (reached ? 1 : 0)) / items.length) * 100}%` }} />
        </div>
      </header>

      <article aria-live="polite" className="card mx-4 mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3.5 pt-3">
          <span className="rounded-full border border-[#EADBA6] bg-[#FBF5E2] px-2.5 py-1 text-xs font-extrabold text-gold-ink">Xisnul Muslim #{it.n}</span>
          <span className="text-xs font-extrabold text-emerald">{t('adhkar.times', { n: it.c })}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-2.5 pb-3.5">
          <p lang="ar" dir="rtl" className="m-0 text-right font-arabic leading-loose" style={{ fontSize: fs }}>{it.t}</p>
          {it.fx === 1 && <p className="m-0 mt-2 text-xs text-muted">{t('adhkar.fixedCount', { n: it.c })}</p>}
          {showMeaning && (
            <div ref={meaningRef} className="mt-2.5 rounded-2xl border border-[#D3E5DA] bg-[#F1F7F3] px-3.5 py-3">
              <p className="eyebrow m-0 mb-1.5 !text-emerald">{t('adhkar.meaningTitle')}</p>
              <p lang="so" className="m-0 text-[15px] leading-relaxed">{it.so || t('adhkar.noMeaning')}</p>
              {it.rf && <p className="m-0 mt-2 text-xs leading-normal text-[#4A473C]"><strong>{t('adhkar.reference')}:</strong> {it.rf}</p>}
              <p className="m-0 mt-2 text-xs text-muted">{t('adhkar.meaningSource')}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-3.5 pb-3">
          <button type="button" onClick={toggleMeaning} aria-pressed={showMeaning} className="h-9 rounded-full border border-hair bg-paper px-3 text-xs font-bold text-emerald">
            {showMeaning ? t('adhkar.hideMeaning') : t('adhkar.meaning')}
          </button>
          <button type="button" onClick={() => { window.clearTimeout(timer.current); setCount(0) }} className="h-9 rounded-full border border-hair bg-paper px-3 text-xs font-bold text-[#4A473C]">
            {t('adhkar.reset')}
          </button>
        </div>
      </article>

      <section className="flex flex-none items-center gap-3.5 px-4 pt-4 pb-4">
        <div className="flex flex-1 flex-col gap-2.5">
          <p className="m-0 text-[13px] text-[#4A473C]">{reached ? t(last ? 'adhkar.reachedLast' : 'adhkar.reachedNext') : t('adhkar.tapHint', { n: it.c - count })}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={i === 0}
              onClick={() => { window.clearTimeout(timer.current); setI(i - 1); setCount(0); setShowMeaning(false) }}
              aria-label={t('adhkar.prev')}
              className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-hair bg-paper disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            </button>
            <button
              type="button"
              disabled={!reached}
              onClick={goNext}
              className={`flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[14px] text-sm font-extrabold ${reached ? 'bg-emerald text-ivory' : 'bg-sand text-muted'}`}
            >
              {!reached && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>}
              {last ? t('adhkar.finish') : t('adhkar.next')}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={tap}
          aria-label={reached ? t('adhkar.reachedLabel') : t('adhkar.tapLabel', { c: count, n: it.c })}
          className="relative h-[168px] w-[168px] flex-none rounded-full bg-emerald text-ivory shadow-[0_12px_30px_rgba(7,31,25,0.35)] transition-transform active:scale-95"
        >
          <svg aria-hidden="true" width="168" height="168" viewBox="0 0 168 168" className="absolute inset-0">
            <circle cx="84" cy="84" r="74" fill="none" stroke="#1E4A3C" strokeWidth="6" />
            {count > 0 && (
              <circle cx="84" cy="84" r="74" fill="none" stroke={reached ? '#C9A34E' : '#E9D49E'} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${((circ * Math.min(count, it.c)) / it.c).toFixed(1)} ${circ}`} transform="rotate(-90 84 84)" />
            )}
            {Array.from({ length: beads }, (_, k) => {
              const a = -Math.PI / 2 + (k * 2 * Math.PI) / beads
              return <circle key={k} cx={84 + 60 * Math.cos(a)} cy={84 + 60 * Math.sin(a)} r="3.5" fill={k < lit ? '#E9D49E' : 'rgba(233,212,158,0.18)'} />
            })}
          </svg>
          <span className="relative flex flex-col items-center">
            {reached ? (
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#E9D49E" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
            ) : (
              <>
                <span className="font-serif text-[46px] leading-none font-semibold tabular-nums">{count}</span>
                <span className="text-[13px] font-semibold text-[#D9E2D6]">/ {it.c}</span>
              </>
            )}
          </span>
        </button>
      </section>
    </div>
  )
}
