import { useEffect, useState } from 'react'
import { t } from '../../i18n'
import type { QuranData } from '../../lib/data'
import { juzStart, placeSo, searchSurahs } from '../../lib/quran'

export function SurahList({ q, onOpen }: { q: QuranData; onOpen: (s: number, a: number) => void }) {
  const [mode, setMode] = useState<'surah' | 'juz'>('surah')
  const [query, setQuery] = useState('')
  const list = searchSurahs(q.surahs, query)
  const shown = useProgressive(list.length)

  const seg = (on: boolean) =>
    `h-10 rounded-[10px] text-[13px] font-bold ${on ? 'bg-paper text-emerald shadow-sm' : 'bg-transparent text-[#4A473C]'}`

  return (
    <div className="flex flex-col gap-2.5">
      <div role="tablist" aria-label={t('quran.tabsLabel')} className="grid grid-cols-2 gap-1 rounded-[14px] bg-sand p-1">
        <button type="button" role="tab" aria-selected={mode === 'surah'} onClick={() => setMode('surah')} className={seg(mode === 'surah')}>{t('quran.bySurah')}</button>
        <button type="button" role="tab" aria-selected={mode === 'juz'} onClick={() => setMode('juz')} className={seg(mode === 'juz')}>{t('quran.byJuz')}</button>
      </div>

      {mode === 'surah' ? (
        <>
          <label className="flex h-11 items-center gap-2 rounded-[14px] border border-hair bg-paper px-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6656" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <span className="sr-only">{t('quran.searchLabel')}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('quran.search')}
              className="flex-1 border-none bg-transparent text-sm font-medium text-ink outline-none"
            />
          </label>
          {list.length === 0 && <p className="m-0 py-6 text-center text-sm text-muted">{t('quran.noResults')}</p>}
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {list.slice(0, shown).map((s) => (
              <li key={s.n} className="[contain-intrinsic-size:auto_60px] [content-visibility:auto]">
                <button type="button" onClick={() => onOpen(s.n, 1)} className="card flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:border-gold">
                  <Medal n={s.n} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold">{s.name}</span>
                    <span className="block text-xs text-muted">{placeSo(s.place)} · {s.ayahs} {t('quran.ayahs')} · {t('quran.page')} {s.page}</span>
                  </span>
                  <span lang="ar" dir="rtl" className="font-quran text-xl text-emerald">{s.ar}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {q.juz.map((j) => {
            const start = juzStart(q, j.n)
            return (
              <li key={j.n}>
                <button type="button" onClick={() => onOpen(start.s, start.a)} className="card flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:border-gold">
                  <Medal n={j.n} />
                  <span className="flex-1">
                    <span className="block text-[15px] font-bold">{t('quran.juz')} {j.n}</span>
                    <span className="block text-xs text-muted">{t('quran.juzStarts')}: {start.label}</span>
                  </span>
                  <span className="text-xs font-bold text-muted">{t('quran.page')} {j.page}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Small eight-point-star medallion with a number. */
function Medal({ n }: { n: number }) {
  return <span className="medal flex h-10 w-10 flex-none items-center justify-center text-[13px] font-extrabold text-emerald" aria-hidden="true">{n}</span>
}

const FIRST = 20, STEP = 24

/** Shows the first rows at once and adds the rest in small idle-time chunks, so the page never freezes. */
function useProgressive(total: number) {
  const [shown, setShown] = useState(Math.min(total, FIRST))
  useEffect(() => {
    if (shown >= total) return
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 16))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const id = idle(() => setShown((n) => Math.min(total, n + STEP)))
    return () => cancel(id)
  }, [shown, total])
  return Math.min(shown, total) || Math.min(total, FIRST)
}
