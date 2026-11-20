import { useEffect, useMemo, useState } from 'react'
import { t } from '../../i18n'
import type { QuranData } from '../../lib/data'
import { arabicDigits, basmalaText, lastReadFor, placeSo, showsBasmala, type LastRead } from '../../lib/quran'
import { useStored } from '../../lib/store'
import { useSurah } from '../../lib/useData'
import { ChevronLeftIcon } from '../Icons'

export type ReaderTheme = 'light' | 'sepia' | 'dark'
const THEMES: Record<ReaderTheme, { bg: string; fg: string; alt: string; line: string; mark: string }> = {
  light: { bg: '#FFFFFF', fg: '#13201B', alt: '#F3F5F1', line: '#ECE6D6', mark: '#F3E7C3' },
  sepia: { bg: '#F7F0DF', fg: '#2A2112', alt: '#EFE3C4', line: '#E6DAB9', mark: '#F0DDA6' },
  dark: { bg: '#0E1A16', fg: '#E8EFEA', alt: '#16261F', line: '#22342C', mark: '#3A3216' },
}
const CHUNK = 40

export function Reader({ q, s, a, onBack, onOpen }: { q: QuranData; s: number; a: number; onBack: () => void; onOpen: (s: number, a: number) => void }) {
  const surah = q.surahs[s - 1]
  const [theme, setTheme] = useStored<ReaderTheme>('quran.theme', 'sepia')
  const [fs, setFs] = useStored<number>('quran.fontSize', 26)
  const [bm, setBm] = useStored<{ s: number; a: number } | null>('quran.bookmark', null)
  const [, setLast] = useStored<LastRead | null>('quran.last', null)
  const [limit, setLimit] = useState(CHUNK)
  const [from, setFrom] = useState(a)

  // opening a surah/ayah resets the window and records the reading position
  useEffect(() => {
    setFrom(a)
    setLimit(CHUNK)
    setLast(lastReadFor(q, s, a))
  }, [q, s, a, setLast])

  // the surah's text is fetched on demand (and cached offline by the service worker)
  const { data: text, error: textError } = useSurah(s)
  const { data: fatiha } = useSurah(1)
  const end = Math.min(surah.ayahs, from - 1 + limit)
  const verses = useMemo(
    () => (text ? text.v.slice(from - 1, end).map((pair, i) => ({ n: from + i, ar: pair[0], so: pair[1] })) : []),
    [text, from, end],
  )
  const c = THEMES[theme]
  const btn = `flex h-10 min-w-10 items-center justify-center rounded-[10px] border px-2 text-[13px] font-bold`

  return (
    <div className="-mx-4 -mt-3.5 min-h-[70dvh] px-4 pt-3.5 pb-6" style={{ background: c.bg, color: c.fg }}>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onBack} aria-label={t('quran.backToList')} className={btn} style={{ borderColor: c.line, color: c.fg }}>
          <ChevronLeftIcon />
        </button>
        <div className="min-w-0 flex-1">
          <p className="m-0 font-serif text-[17px] font-semibold">{surah.n}. {surah.name}</p>
          <p className="m-0 text-xs opacity-80">{placeSo(surah.place)} · {surah.ayahs} {t('quran.ayahs')} · {t('quran.page')} {surah.p[from - 1]}</p>
        </div>
        <button type="button" onClick={() => setFs(Math.max(18, fs - 2))} aria-label={t('quran.fontDown')} className={btn} style={{ borderColor: c.line, color: c.fg }}>A−</button>
        <button type="button" onClick={() => setFs(Math.min(42, fs + 2))} aria-label={t('quran.fontUp')} className={btn} style={{ borderColor: c.line, color: c.fg }}>A+</button>
      </div>

      <div role="radiogroup" aria-label={t('quran.themeLabel')} className="mt-2.5 flex gap-2">
        {(Object.keys(THEMES) as ReaderTheme[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={theme === k}
            onClick={() => setTheme(k)}
            className="h-9 rounded-full px-3 text-xs font-bold"
            style={{ background: THEMES[k].bg, color: THEMES[k].fg, border: theme === k ? '2px solid #C9A34E' : '1px solid #A9B3AE' }}
          >
            {t(`quran.themes.${k}`)}
          </button>
        ))}
      </div>

      {/* ornamental surah frame */}
      <div
        className="relative mt-3 flex h-[70px] items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-gold"
        style={{ background: theme === 'dark' ? 'linear-gradient(180deg,#13392E,#0E1A16)' : `linear-gradient(180deg, ${c.alt}, ${c.bg})` }}
      >
        <span aria-hidden="true" className="absolute inset-[5px] rounded-xl border border-gold/55" />
        <FrameStar className="left-3.5" />
        <FrameStar className="right-3.5" />
        <span lang="ar" dir="rtl" className="relative px-4 font-quran text-[27px]">سورة {surah.ar}</span>
      </div>

      {from === 1 && showsBasmala(surah.n) && fatiha && (
        <p lang="ar" dir="rtl" className="m-0 mt-2 text-center font-quran text-[25px] leading-loose">{basmalaText(fatiha)}</p>
      )}
      {from > 1 && (
        <p className="m-0 mt-2 text-center text-xs font-bold opacity-85">
          {t('quran.startingAt', { a: from })} ·{' '}
          <button type="button" onClick={() => { setLimit(from - 1 + limit); setFrom(1) }} className="underline">{t('quran.fromStart')}</button>
        </p>
      )}

      {!text && !textError && <p role="status" className="m-0 py-8 text-center text-sm opacity-80">{t('common.loading')}</p>}
      {textError && <p role="alert" className="m-0 py-6 text-center text-sm">{t('quran.loadError')}</p>}
      <div className="mt-2">
        {verses.map((v) => {
          const marked = bm?.s === s && bm.a === v.n
          return (
            <article key={v.n} className="rounded-2xl px-3 py-2.5" style={marked ? { background: c.mark } : { borderBottom: `1px solid ${c.line}` }}>
              <p lang="ar" dir="rtl" className="m-0 text-right font-quran leading-[2.15]" style={{ fontSize: fs }}>
                {v.ar}{' '}
                <button
                  type="button"
                  onClick={() => { setBm({ s, a: v.n }); setLast(lastReadFor(q, s, v.n)) }}
                  aria-label={t('quran.mark', { n: v.n })}
                  aria-pressed={marked}
                  className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-full border-[1.5px] border-gold px-1 align-middle font-quran text-[15px]"
                  style={{ boxShadow: `inset 0 0 0 3px ${c.bg}, inset 0 0 0 4px rgba(201,163,78,0.55)`, background: marked ? '#E9D49E' : 'transparent', color: marked ? '#2A2112' : c.fg }}
                >
                  {arabicDigits(v.n)}
                </button>
              </p>
              <p className="m-0 mt-1.5 leading-relaxed opacity-90" style={{ fontSize: Math.round(fs * 0.56) }}>{v.n}. {v.so}</p>
            </article>
          )
        })}
      </div>

      {text && end < surah.ayahs && (
        <button
          type="button"
          onClick={() => { setLimit(limit + CHUNK); setLast(lastReadFor(q, s, end + 1)) }}
          className="mt-3 h-11 w-full rounded-xl border border-gold text-[13px] font-bold"
        >
          {t('quran.more')}
        </button>
      )}
      {text && end >= surah.ayahs && surah.n < 114 && (
        <button type="button" onClick={() => onOpen(surah.n + 1, 1)} className="mt-3 h-12 w-full rounded-xl bg-emerald text-sm font-bold text-ivory">
          {t('quran.nextSurah', { name: q.surahs[surah.n].name })}
        </button>
      )}
      <p className="m-0 mt-3 text-xs leading-relaxed opacity-80">{t('quran.sourceNote')}</p>
    </div>
  )
}

function FrameStar({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48" className={`absolute top-1/2 -mt-[9px] ${className}`}>
      <path d="M24 2 L30 18 L46 24 L30 30 L24 46 L18 30 L2 24 L18 18 Z" fill="#C9A34E" />
    </svg>
  )
}
