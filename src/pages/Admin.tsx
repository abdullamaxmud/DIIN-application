import { useEffect, useMemo, useState } from 'react'
import { t } from '../i18n'
import { api, ApiError } from '../lib/api'

type Range = 'today' | 'week' | 'month'

interface AdminUser {
  id: string
  kind: 'google' | 'email' | 'guest'
  name: string
  email: string | null
  city: string | null
  country: string | null
  platform: string | null
  installed: boolean
  push: boolean
  joined: string
  lastSeen: string
  progress: {
    wird: number
    wirdStreak: number
    plan: { day: number; days: number; finished: boolean } | null
    adhkarToday: string[]
    lastRead: { name: string; a: number; page: number } | null
  }
}

interface Stats {
  range: Range
  visitors: number
  active: number
  installed: number
  accounts: Partial<Record<'google' | 'email' | 'guest', number>>
  push: number
  daily: { day: string; n: number }[]
  platforms: { platform: string | null; n: number }[]
  countries: { country: string | null; n: number }[]
  features: { feature: string; n: number }[]
  users: AdminUser[]
}

const KEY = 'diin.adminKey'
const fmt = (n: number) => n.toLocaleString('en-US')
const country = (c: string | null) => (c ? (t(`countries.${c}`) !== `countries.${c}` ? t(`countries.${c}`) : c) : t('admin.unknown'))
const place = (u: AdminUser) => [u.city, u.country ? country(u.country) : null].filter(Boolean).join(', ') || t('admin.unknown')

/** "5 daqiiqo kahor" from a UTC "YYYY-MM-DD HH:MM:SS" timestamp. */
function ago(ts: string): string {
  const ms = Date.now() - new Date(ts.replace(' ', 'T') + 'Z').getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return t('admin.ago.now')
  if (min < 60) return t('admin.ago.min', { n: min })
  if (min < 1440) return t('admin.ago.hour', { n: Math.floor(min / 60) })
  return t('admin.ago.day', { n: Math.floor(min / 1440) })
}
const dateSo = (ts: string) => new Date(ts.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const Bar = ({ value, max, gold }: { value: number; max: number; gold?: boolean }) => (
  <span className="block h-2.5 overflow-hidden rounded-full bg-[#EFE6D2]">
    <span className={`block h-full rounded-full ${gold ? 'bg-gold-ink' : 'bg-emerald'}`} style={{ width: `${max ? Math.round((value / max) * 100) : 0}%` }} />
  </span>
)

function Login({ onKey, error }: { onKey: (k: string) => void; error: string }) {
  const [k, setK] = useState('')
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ivory px-4">
      <form onSubmit={(e) => { e.preventDefault(); if (k) onKey(k) }} className="card flex w-full max-w-sm flex-col gap-3 p-6">
        <p className="m-0 font-serif text-xl font-semibold tracking-[0.18em] text-emerald">DIIN</p>
        <h1 className="m-0 font-serif text-2xl font-semibold text-emerald">{t('admin.loginTitle')}</h1>
        <label htmlFor="ak" className="text-[13px] font-extrabold text-emerald">{t('admin.password')}</label>
        <input id="ak" type="password" autoComplete="current-password" value={k} onInput={(e) => setK((e.target as HTMLInputElement).value)}
          className="h-12 rounded-xl border border-hair bg-paper px-3 text-[15px] outline-none focus:border-gold focus:ring-2 focus:ring-gold/40" />
        {error && <p role="alert" className="m-0 text-[13px] font-bold text-[#7A2A0C]">{error}</p>}
        <button type="submit" className="h-12 rounded-xl bg-emerald font-extrabold text-ivory">{t('admin.enter')}</button>
      </form>
    </div>
  )
}

/** /admin — the owner's dashboard (password checked by the server; nothing is shown without it). */
export default function Admin() {
  const [key, setKey] = useState<string>(() => { try { return sessionStorage.getItem(KEY) ?? '' } catch { return '' } })
  const [range, setRange] = useState<Range>('week')
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)

  useEffect(() => {
    document.title = `DIIN — ${t('admin.title')}`
    let meta = document.querySelector('meta[name="robots"]')
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'robots'); document.head.appendChild(meta) }
    meta.setAttribute('content', 'noindex')
  }, [])

  const load = async (k = key, r = range) => {
    if (!k) return
    setLoading(true); setError('')
    try {
      const s = await api<Stats>('/api/admin/stats', { range: r }, k)
      setStats(s)
      try { sessionStorage.setItem(KEY, k) } catch { /* ignore */ }
    } catch (e) {
      const code = e instanceof ApiError ? e : null
      setError(code?.status === 401 ? t('admin.wrong') : code?.status === 503 ? t('admin.notConfigured') : t('admin.offline'))
      if (code?.status === 401) { setKey(''); try { sessionStorage.removeItem(KEY) } catch { /* ignore */ } }
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [key, range]) // eslint-disable-line react-hooks/exhaustive-deps

  const users = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (stats?.users ?? []).filter((u) => !s || u.name.toLowerCase().includes(s) || place(u).toLowerCase().includes(s))
  }, [stats, q])
  const selected = users.find((u) => u.id === sel) ?? users[0] ?? null

  if (!key || (!stats && error)) return <Login onKey={(k) => setKey(k)} error={error} />
  if (!stats) return <p role="status" className="m-0 py-24 text-center text-sm text-muted">{t('common.loading')}</p>

  const maxDay = Math.max(1, ...stats.daily.map((d) => d.n))
  const plat = ['android', 'ios', 'desktop'].map((p) => ({ p, n: stats.platforms.find((x) => x.platform === p)?.n ?? 0 }))
  const platMax = Math.max(1, ...plat.map((x) => x.n))
  const ctrMax = Math.max(1, ...stats.countries.map((c) => c.n))
  const feats = ['quran', 'listen', 'adhkar', 'prayer', 'khatma'].map((f) => ({ f, n: stats.features.find((x) => x.feature === f)?.n ?? 0 }))
  const featMax = Math.max(1, ...feats.map((x) => x.n))
  const accTotal = (stats.accounts.google ?? 0) + (stats.accounts.email ?? 0) + (stats.accounts.guest ?? 0)
  const kpis = [
    { label: t('admin.visitors'), value: stats.visitors, note: t(`admin.rangeNote.${stats.range}`) },
    { label: t('admin.active'), value: stats.active, note: t(`admin.rangeNote.${stats.range}`) },
    { label: t('admin.installed'), value: stats.installed, note: t('admin.installedNote') },
    { label: t('admin.accounts'), value: accTotal, note: t('admin.accountsNote', { g: stats.accounts.google ?? 0, e: stats.accounts.email ?? 0, d: stats.accounts.guest ?? 0 }) },
    { label: t('admin.push'), value: stats.push, note: t('admin.pushNote') },
  ]
  const card = 'rounded-[20px] border border-hair bg-paper p-[18px]'
  const h2 = 'm-0 font-serif text-[17px] font-semibold text-emerald'
  const planText = (u: AdminUser) => !u.progress.plan ? t('admin.noPlan') : u.progress.plan.finished ? t('admin.planDone') : t('admin.planDay', { d: u.progress.plan.day, n: u.progress.plan.days })
  const adhkarText = (u: AdminUser) => u.progress.adhkarToday.length
    ? u.progress.adhkarToday.map((k) => (k === 'subax' ? 'Subax ✓' : k === 'fiid' ? 'Fiid ✓' : null)).filter(Boolean).join(' · ') || '✓'
    : '—'

  return (
    <div className="min-h-dvh bg-ivory text-ink">
      <header className="night">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-6 py-[18px]">
          <div className="flex items-center gap-3">
            <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="#C9A34E" strokeWidth="2.6" strokeLinejoin="round"><rect x="11" y="11" width="26" height="26" /><rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" /></g><circle cx="24" cy="24" r="5" fill="#E9D49E" /></svg>
            <div>
              <p className="m-0 font-serif text-xl font-semibold tracking-[0.18em]">DIIN</p>
              <p className="m-0 text-xs font-bold text-gold-soft">{t('admin.title')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void load()} disabled={loading} className="h-10 rounded-xl border border-ivory/25 px-3.5 text-[13px] font-bold text-ivory disabled:opacity-60">{loading ? t('common.loading') : t('admin.refresh')}</button>
            <button type="button" onClick={() => { try { sessionStorage.removeItem(KEY) } catch { /* ignore */ } setKey(''); setStats(null) }} className="h-10 rounded-xl border border-ivory/25 px-3.5 text-[13px] font-bold text-ivory">{t('admin.signOut')}</button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1240px] flex-col gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="m-0 font-serif text-[28px] font-semibold text-emerald">{t('admin.overview')}</h1>
            <p className="m-0 mt-1 text-[13.5px] text-muted">{t('admin.overviewSub')}</p>
          </div>
          <div role="group" aria-label="Muddada" className="flex gap-1 rounded-[14px] bg-[#EFE6D2] p-1">
            {(['today', 'week', 'month'] as Range[]).map((r) => (
              <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}
                className={`h-9 rounded-[10px] px-3.5 text-[13px] font-bold ${range === r ? 'bg-emerald text-white' : 'text-[#4A473C]'}`}>{t(`admin.ranges.${r}`)}</button>
            ))}
          </div>
        </div>

        <section aria-label={t('admin.overview')} className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col gap-1.5 rounded-[18px] border border-hair bg-paper p-4">
              <p className="eyebrow m-0">{k.label}</p>
              <p className="m-0 font-serif text-[32px] font-semibold text-emerald tabular-nums">{fmt(k.value)}</p>
              <p className="m-0 text-xs font-bold text-[#3F6B4F]">{k.note}</p>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap gap-5">
          <section aria-labelledby="a-daily" className={`${card} min-w-0 flex-[999_1_560px]`}>
            <h2 id="a-daily" className={h2}>{t('admin.daily')}</h2>
            <p className="m-0 mt-0.5 mb-3.5 text-xs text-muted">{t('admin.dailySub')}</p>
            <div role="img" aria-label={t('admin.dailyLabel')} className="grid h-[200px] grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1.5 border-b border-hair">
              {stats.daily.map((d, i) => (
                <div key={d.day} className="flex h-full flex-col items-center justify-end gap-1">
                  <span className="text-[10.5px] font-bold text-muted tabular-nums">{d.n}</span>
                  <span className={`block w-full rounded-t-md ${i === 13 ? 'bg-gold' : 'bg-emerald'}`} style={{ height: `${Math.round((d.n / maxDay) * 160)}px` }} />
                </div>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5">
              {stats.daily.map((d) => <span key={d.day} className="text-center text-[10.5px] text-muted">{Number(d.day.slice(8))}</span>)}
            </div>
          </section>

          <section aria-labelledby="a-plat" className={`${card} flex min-w-0 flex-[1_1_300px] flex-col gap-3`}>
            <h2 id="a-plat" className={h2}>{t('admin.platforms')}</h2>
            {plat.map((x) => (
              <div key={x.p} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[13px] font-bold"><span>{t(`admin.platformNames.${x.p}`)}</span><span className="tabular-nums">{fmt(x.n)}</span></div>
                <Bar value={x.n} max={platMax} />
              </div>
            ))}
          </section>
        </div>

        <div className="flex flex-wrap gap-5">
          <section aria-labelledby="a-ctr" className={`${card} flex min-w-0 flex-[1_1_340px] flex-col gap-2.5`}>
            <h2 id="a-ctr" className={h2}>{t('admin.countries')}</h2>
            {stats.countries.length === 0 && <p className="m-0 text-[13px] text-muted">{t('admin.empty')}</p>}
            {stats.countries.map((c) => (
              <div key={c.country ?? '?'} className="grid grid-cols-[120px_minmax(0,1fr)_48px] items-center gap-2.5 text-[13px]">
                <span className="font-bold">{country(c.country)}</span><Bar value={c.n} max={ctrMax} gold /><span className="text-right font-bold tabular-nums">{fmt(c.n)}</span>
              </div>
            ))}
          </section>
          <section aria-labelledby="a-feat" className={`${card} flex min-w-0 flex-[1_1_340px] flex-col gap-2.5`}>
            <h2 id="a-feat" className={h2}>{t('admin.features')} <span className="font-sans text-xs font-semibold text-muted">{t('admin.featuresSub')}</span></h2>
            {feats.map((x) => (
              <div key={x.f} className="grid grid-cols-[120px_minmax(0,1fr)_48px] items-center gap-2.5 text-[13px]">
                <span className="font-bold">{t(`admin.featureNames.${x.f}`)}</span><Bar value={x.n} max={featMax} /><span className="text-right font-bold tabular-nums">{fmt(x.n)}</span>
              </div>
            ))}
          </section>
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <section aria-labelledby="a-users" className={`${card} flex min-w-0 flex-[999_1_640px] flex-col gap-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <h2 id="a-users" className={h2}>{t('admin.users')} <span className="font-sans text-xs font-semibold text-muted">({fmt(stats.users.length)})</span></h2>
              <label className="flex h-[42px] min-w-[220px] items-center gap-2 rounded-xl border border-hair bg-white px-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5E5B4F" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
                <span className="sr-only">{t('admin.search')}</span>
                <input type="search" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} placeholder={t('admin.search')} className="flex-1 border-none bg-transparent text-[13px] font-semibold outline-none" />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] tracking-[0.1em] text-umber uppercase">
                    {['colName', 'colCity', 'colVia', 'colWird', 'colPlan', 'colAdhkar', 'colLast'].map((c) => <th key={c} className="px-2.5 py-2 font-extrabold">{t(`admin.${c}`)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={`border-t border-[#EFE6D2] ${selected?.id === u.id ? 'bg-[#FBF5E2]' : ''}`}>
                      <td className="p-0"><button type="button" onClick={() => setSel(u.id)} className="min-h-12 w-full px-2.5 py-2 text-left text-[13px] font-extrabold text-emerald">{u.name}</button></td>
                      <td className="px-2.5 py-2">{place(u)}</td>
                      <td className="px-2.5 py-2"><span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-extrabold ${u.kind === 'guest' ? 'bg-[#F3ECDC] text-[#5C4A10]' : 'bg-[#EEF1E6] text-emerald'}`}>{t(`admin.via.${u.kind}`)}</span></td>
                      <td className="min-w-[130px] px-2.5 py-2">
                        <div className="flex items-center gap-2"><span className="flex-1"><Bar value={u.progress.wird} max={30} gold={u.progress.wird >= 30} /></span><span className="font-bold whitespace-nowrap tabular-nums">{u.progress.wird}/30</span></div>
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap">{planText(u)}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap">{adhkarText(u)}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-muted">{ago(u.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && <p className="m-0 p-4 text-center text-[13px] text-muted">{stats.users.length ? t('admin.noUsers') : t('admin.empty')}</p>}
          </section>

          {selected && (
            <aside aria-labelledby="a-sel" className="night flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-[20px] p-[18px]">
              <p className="eyebrow m-0 !text-gold-soft">{t('admin.detail')}</p>
              <h2 id="a-sel" className="m-0 font-serif text-[22px] font-semibold">{selected.name}</h2>
              <p className="m-0 text-[13px] text-[#C9D6CF]">{place(selected)} · {t(`admin.via.${selected.kind}`)}{selected.email ? ` · ${selected.email}` : ''}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  [t('admin.colWird'), `${selected.progress.wird}/30`],
                  [t('admin.colPlan'), planText(selected)],
                  [t('admin.lastRead'), selected.progress.lastRead ? `${selected.progress.lastRead.name} ${selected.progress.lastRead.a}` : '—'],
                  [t('admin.colAdhkar'), adhkarText(selected)],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-[14px] bg-ivory/[0.07] p-3"><p className="m-0 text-[11px] text-[#C9D6CF]">{l}</p><p className="m-0 mt-0.5 text-[15px] font-extrabold">{v}</p></div>
                ))}
              </div>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
                <li className="flex justify-between gap-2.5"><span className="text-[#C9D6CF]">{t('admin.streakLabel')}</span><span className="font-bold">{t('admin.streak', { n: selected.progress.wirdStreak })}</span></li>
                <li className="flex justify-between gap-2.5"><span className="text-[#C9D6CF]">{t('admin.joined')}</span><span className="font-bold">{dateSo(selected.joined)}</span></li>
                <li className="flex justify-between gap-2.5"><span className="text-[#C9D6CF]">{t('admin.appInstalled')}</span><span className="font-bold">{selected.installed ? `${t('admin.yes')}${selected.platform ? ` · ${t(`admin.platformNames.${selected.platform}`)}` : ''}` : t('admin.no')}</span></li>
                <li className="flex justify-between gap-2.5"><span className="text-[#C9D6CF]">{t('admin.notifications')}</span><span className="font-bold">{selected.push ? t('admin.yes') : t('admin.no')}</span></li>
                <li className="flex justify-between gap-2.5"><span className="text-[#C9D6CF]">{t('admin.colLast')}</span><span className="font-bold">{ago(selected.lastSeen)}</span></li>
              </ul>
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}
