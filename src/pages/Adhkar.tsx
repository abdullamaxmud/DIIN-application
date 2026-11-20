import { useState } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../i18n'
import { useHisnIndex } from '../lib/useData'
import { CATEGORY_SO, GROUPS } from '../lib/adhkar'
import { useAdhkarTime, useDoneToday } from '../lib/adhkarProgress'
import { PageHeader } from '../components/PageHeader'
import { MoonIcon } from '../components/Icons'

export default function Adhkar() {
  const { data: h } = useHisnIndex()
  const { cats } = useDoneToday()
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const evening = useAdhkarTime() === 'fiid'
  const q = query.trim().toLowerCase()

  let seq = 0
  return (
    <>
      <PageHeader title={t('pages.adhkar')} subtitle={t('adhkar.author')}>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          {(['subax', 'fiid'] as const).map((k) => {
            const highlighted = (k === 'fiid') === evening
            return (
              <Link
                key={k}
                to={`/adkaarta/${k}`}
                className={`flex min-h-[104px] flex-col items-start gap-1 rounded-[18px] px-3.5 py-3 no-underline ${
                  highlighted ? 'bg-gold text-night' : 'border border-[#2F6B55] bg-[#11463A] text-ivory'
                }`}
              >
                {k === 'subax' ? (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
                ) : (
                  <MoonIcon size={26} />
                )}
                <span className="font-serif text-base font-semibold">{CATEGORY_SO[k]}</span>
                <span className="text-xs opacity-85">
                  {cats[k] ? t('adhkar.doneToday') : h ? `${t('adhkar.count', { n: h.counts[k] })} · ${t(k === 'subax' ? 'adhkar.afterFajr' : 'adhkar.afterAsr')}` : '…'}
                </span>
              </Link>
            )
          })}
        </div>
      </PageHeader>

      <main className="flex flex-col gap-3.5 px-4 pt-3.5">
        {!h && <p role="status" className="m-0 py-6 text-center text-sm text-muted">{t('common.loading')}</p>}
        <label className="flex min-h-11 items-center gap-2 rounded-[14px] border border-hair bg-paper px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6656" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <span className="sr-only">{t('adhkar.searchLabel')}</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('adhkar.search')} className="flex-1 border-none bg-transparent text-sm font-medium outline-none" />
        </label>

        {h && GROUPS.map(([title, ids]) => {
          const rows = ids.map((id) => {
            const ch = h.chapters.find((c) => c.id === id)!
            return { id, num: ++seq, ch, so: CATEGORY_SO[id] }
          }).filter((r) => !q || `${r.so} ${title}`.toLowerCase().includes(q) || r.ch.title.includes(query.trim()))
          if (!rows.length) return null
          return (
            <section key={title} className="flex flex-col gap-1.5">
              <h2 className="eyebrow m-0 mb-0.5 ml-1">{title}</h2>
              {rows.map((r) => (
                <Link key={r.id} to={`/adkaarta/${r.id}`} className="card flex min-h-14 items-center gap-3 px-3 py-2 text-ink no-underline hover:border-gold">
                  <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] text-[13px] font-extrabold ${cats[r.id] ? 'bg-emerald text-ivory' : 'bg-[#EEF1E6] text-emerald'}`}>{r.num}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{r.so}</span>
                    <span lang="ar" dir="rtl" className="block text-left text-sm text-muted">{r.ch.title}</span>
                  </span>
                  <span className="text-xs font-bold text-muted">{t('adhkar.count', { n: r.ch.count })}</span>
                </Link>
              ))}
            </section>
          )
        })}

        {h && (
          <>
            <button type="button" onClick={() => setShowAll(!showAll)} aria-expanded={showAll} className="min-h-12 rounded-[14px] border-[1.5px] border-dashed border-[#CDBB8E] text-[13px] font-bold text-emerald">
              {showAll ? t('adhkar.hideAll') : t('adhkar.all', { n: h.chapters.length })}
            </button>
            {showAll && (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {h.chapters.filter((c) => !q || c.title.includes(query.trim()) || c.en.toLowerCase().includes(q)).map((c, k) => (
                  <li key={c.id}>
                    <Link to={`/adkaarta/${c.id}`} className="card flex min-h-[52px] items-center gap-3 px-3 py-2 text-ink no-underline">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#EEF1E6] text-xs font-extrabold text-emerald">{k + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span lang="ar" dir="rtl" className="block text-left font-arabic text-base">{c.title}</span>
                        <span className="block text-xs text-muted">{c.en}</span>
                      </span>
                      <span className="text-xs text-muted">{c.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <p className="m-0 text-xs leading-relaxed text-muted">{t('adhkar.source')}</p>
      </main>
    </>
  )
}
