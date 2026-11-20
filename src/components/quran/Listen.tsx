import { useEffect, useState } from 'react'
import { t } from '../../i18n'
import type { QuranData } from '../../lib/data'
import { RECITERS, formatClock } from '../../lib/audio'
import { usePlayer } from '../../lib/player'
import { StarPattern } from '../StarPattern'
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from '../Icons'

export function Listen({ q }: { q: QuranData }) {
  const p = usePlayer()
  const [listOpen, setListOpen] = useState(false)
  const { activate } = p
  useEffect(() => { activate() }, [activate])
  const s = q.surahs[p.surah - 1]
  const r = RECITERS.find((x) => x.id === p.reciter) ?? RECITERS[0]
  const initials = (name: string) => name.split(/[\s-]+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join('')

  return (
    <div className="flex flex-col gap-3">
      <section aria-label={t('quran.listen.now')} className="night relative overflow-hidden rounded-3xl p-4 shadow-[0_16px_30px_-18px_rgba(7,31,25,0.9)]">
        <StarPattern opacity={0.08} size={40} />
        <div className="relative">
          <p className="m-0 text-xs text-mist">{t('quran.listen.now')}: {r.name} ({r.style})</p>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={p.prev} disabled={p.surah <= 1} aria-label={t('quran.listen.prev')} className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#11463A] disabled:opacity-40">
              <ChevronLeftIcon size={18} />
            </button>
            <div className="flex-1 text-center">
              <p className="m-0 font-serif text-xl font-semibold">{s.n}. {s.name}</p>
              <p lang="ar" dir="rtl" className="m-0 font-quran text-xl text-gold-soft">{s.ar}</p>
            </div>
            <button type="button" onClick={p.next} disabled={p.surah >= 114} aria-label={t('quran.listen.next')} className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#11463A] disabled:opacity-40">
              <ChevronRightIcon size={18} />
            </button>
          </div>

          <label className="mt-3 block">
            <span className="sr-only">{t('quran.listen.seek')}</span>
            <input
              type="range"
              min={0}
              max={Number.isFinite(p.duration) && p.duration > 0 ? p.duration : 1}
              step={1}
              value={Math.min(p.time, p.duration || 0)}
              onChange={(e) => p.seek(Number(e.target.value))}
              className="w-full accent-[#C9A34E]"
            />
          </label>
          <div className="flex justify-between text-xs text-mist tabular-nums">
            <span>{formatClock(p.time)}</span>
            <span>{formatClock(p.duration)}</span>
          </div>

          <div className="mt-2 flex items-center justify-center gap-3">
            <button type="button" onClick={() => setListOpen(!listOpen)} aria-expanded={listOpen} className="h-10 rounded-full border border-[#3F6656] px-3 text-xs font-semibold">
              {listOpen ? t('quran.listen.closeList') : t('quran.listen.chooseSurah')}
            </button>
            <button
              type="button"
              onClick={p.toggle}
              aria-label={p.playing ? t('quran.listen.pause') : t('quran.listen.play')}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-night shadow-[0_0_0_8px_rgba(201,163,78,0.15)]"
            >
              {p.loading ? (
                <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-night border-t-transparent" aria-hidden="true" />
              ) : p.playing ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => p.setRepeat(!p.repeat)}
              aria-pressed={p.repeat}
              className={`h-10 rounded-full px-3 text-xs font-semibold ${p.repeat ? 'bg-gold text-night' : 'border border-[#3F6656]'}`}
            >
              {t('quran.listen.repeat')}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            {p.dl === 'saved' ? (
              <>
                <span className="font-bold text-gold-soft">{t('quran.listen.saved')}</span>
                <button type="button" onClick={p.removeOffline} className="underline">{t('quran.listen.remove')}</button>
              </>
            ) : (
              <button type="button" onClick={p.saveOffline} disabled={p.dl === 'saving'} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ivory/10 px-3 font-bold disabled:opacity-70">
                <DownloadIcon size={14} />
                {p.dl === 'saving' ? t('quran.listen.saving') : t('quran.listen.download')}
              </button>
            )}
          </div>
          {p.dl === 'error' && <p role="alert" className="m-0 mt-2 text-center text-xs text-[#F2C9A8]">{t('quran.listen.dlError')}</p>}
          {p.error && <p role="alert" className="m-0 mt-2 text-center text-xs text-[#F2C9A8]">{t('quran.listen.error')}</p>}
        </div>
      </section>

      {listOpen && (
        <ul className="m-0 flex max-h-[320px] list-none flex-col gap-1.5 overflow-y-auto rounded-2xl p-0">
          {q.surahs.map((x) => (
            <li key={x.n}>
              <button
                type="button"
                onClick={() => { p.playSurah(x.n); setListOpen(false) }}
                className={`card flex min-h-12 w-full items-center gap-3 px-3 py-1.5 text-left ${x.n === p.surah ? '!border-gold' : ''}`}
              >
                <span className="w-7 text-center text-xs font-extrabold text-emerald">{x.n}</span>
                <span className="flex-1 text-sm font-bold">{x.name}</span>
                <span lang="ar" dir="rtl" className="font-quran text-lg">{x.ar}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="m-0 mt-1 font-serif text-[15px] font-semibold">{t('quran.listen.reciters', { n: RECITERS.length })}</h2>
      <div role="radiogroup" aria-label={t('quran.listen.reciters', { n: RECITERS.length })} className="flex flex-col gap-1.5">
        {RECITERS.map((x) => {
          const on = x.id === p.reciter
          return (
            <button
              key={x.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => p.setReciter(x.id)}
              className={`card flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left ${on ? '!border-emerald !bg-[#F3ECDC] outline outline-2 outline-emerald' : ''}`}
            >
              <span aria-hidden="true" className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-[13px] font-extrabold ${on ? 'bg-emerald text-ivory' : 'bg-[#FBF5E2] text-[#5C4A10]'}`}>
                {initials(x.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{x.name}</span>
                <span className="block text-xs text-muted">{x.style}</span>
              </span>
              <span lang="ar" dir="rtl" className="text-[13px] text-[#4A473C]">{x.ar}</span>
            </button>
          )
        })}
      </div>
      <p className="m-0 mb-2 text-xs leading-relaxed text-muted">{t('quran.listen.source')}</p>
    </div>
  )
}
