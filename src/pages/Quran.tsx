import { useSearchParams } from 'react-router-dom'
import { t } from '../i18n'
import { useQuran } from '../lib/useData'
import { StarPattern } from '../components/StarPattern'
import { SurahList } from '../components/quran/SurahList'
import { Reader } from '../components/quran/Reader'
import { Listen } from '../components/quran/Listen'
import { Khatmi } from '../components/quran/Khatmi'

type Tab = 'khatmi' | 'akhri' | 'dhageyso'
const TABS: Tab[] = ['khatmi', 'akhri', 'dhageyso']

/**
 * The Quran screen. State lives in the URL (?tab=akhri&s=2&a=1) so the phone's back button,
 * Home shortcuts and "continue reading" all land exactly where they should.
 */
export default function Quran() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'khatmi') as Tab
  const s = Number(params.get('s')) || 0
  const a = Number(params.get('a')) || 1
  const { data: q, error } = useQuran()

  const go = (next: Record<string, string | number | null>, replace = false) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k)
      else p.set(k, String(v))
    }
    setParams(p, { replace })
    window.scrollTo(0, 0)
  }
  const open = (sn: number, an: number) => go({ tab: 'akhri', s: sn, a: an })

  return (
    <>
      <header className="night relative overflow-hidden px-4 pt-[max(18px,env(safe-area-inset-top))] pb-3">
        <StarPattern opacity={0.1} />
        <div className="relative flex items-baseline justify-between">
          <h1 className="m-0 font-serif text-[24px] font-semibold">{t('pages.quran')}</h1>
          <span className="text-xs text-mist">{t('quran.script')}</span>
        </div>
        <div role="tablist" aria-label={t('quran.tabsLabel')} className="relative mt-3 grid grid-cols-3 gap-1 rounded-[14px] bg-[#11463A] p-1">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => go({ tab: id, s: null, a: null })}
              className={`h-10 rounded-[10px] text-[13px] font-bold ${tab === id ? 'bg-ivory text-emerald' : 'text-[#C9D6CC]'}`}
            >
              {t(`quran.tabs.${id}`)}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-3.5">
        {error && <p role="alert" className="card m-0 p-4 text-sm">{t('quran.loadError')}</p>}
        {!q && !error && <p role="status" className="m-0 py-10 text-center text-sm text-muted">{t('common.loading')}</p>}
        {q && tab === 'akhri' && (s >= 1 && s <= 114
          ? <Reader q={q} s={s} a={Math.min(Math.max(1, a), q.surahs[s - 1].ayahs)} onBack={() => go({ s: null, a: null })} onOpen={open} />
          : <SurahList q={q} onOpen={open} />)}
        {q && tab === 'khatmi' && <Khatmi q={q} onOpen={open} />}
        {q && tab === 'dhageyso' && <Listen q={q} />}
      </main>
    </>
  )
}
