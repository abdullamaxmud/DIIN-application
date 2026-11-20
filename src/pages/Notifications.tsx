import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { t, tList } from '../i18n'
import { useLocation } from '../lib/location'
import { isIOS, isStandalone, isSubscribed, pushConfigured, pushSupported, sendTest, subscribe, unsubscribe, useNotifyPrefs, type FivePrayers } from '../lib/push'
import { PRAYERS } from '../lib/prayer'
import { StarPattern } from '../components/StarPattern'
import { BellIcon, BookIcon, MoonIcon, MosqueIcon } from '../components/Icons'

type Status = 'idle' | 'busy' | 'on' | 'denied' | 'unsupported' | 'not-configured' | 'error'

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 flex-none rounded-full transition-colors ${on ? 'bg-emerald' : 'bg-[#D9CFB8]'}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-paper shadow transition-[left] ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

export default function Notifications() {
  const { fix } = useLocation()
  const [prefs, setPrefs] = useNotifyPrefs()
  const [status, setStatus] = useState<Status>('idle')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!pushSupported()) { setStatus('unsupported'); return }
    if (!pushConfigured()) { setStatus('not-configured'); return }
    if (Notification.permission === 'denied') { setStatus('denied'); return }
    isSubscribed().then((on) => on && setStatus('on'))
  }, [])

  const allow = async () => {
    setStatus('busy'); setMsg('')
    try { setStatus((await subscribe(prefs, fix)) === 'ok' ? 'on' : Notification.permission === 'denied' ? 'denied' : 'idle') }
    catch { setStatus('error') }
  }
  const off = async () => { setStatus('busy'); await unsubscribe().catch(() => {}); setStatus('idle') }
  const test = async () => { setMsg(''); try { await sendTest(); setMsg(t('notify.testSent')) } catch { setMsg(t('notify.testFail')) } }

  const showIOS = isIOS() && !isStandalone()
  const row = 'card flex items-center gap-3 px-3.5 py-3'
  const icon = 'flex h-9 w-9 flex-none items-center justify-center rounded-[10px]'

  return (
    <>
      <div className="night relative flex h-[210px] items-center justify-center overflow-hidden rounded-b-[32px]">
        <StarPattern opacity={0.14} />
        <Link to="/" aria-label={t('common.close')} className="absolute top-[max(14px,env(safe-area-inset-top))] right-3.5 flex h-11 w-11 items-center justify-center rounded-xl text-ivory">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </Link>
        <span className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-gold text-night shadow-[0_0_0_14px_rgba(212,175,55,0.18)]">
          <BellIcon size={48} />
        </span>
      </div>

      <main className="flex flex-col gap-3 px-5 pt-5">
        <div>
          <h1 className="m-0 font-serif text-[23px] font-semibold text-emerald">{t('notify.title')}</h1>
          <p className="m-0 mt-1.5 text-sm leading-relaxed text-[#4A473C]">{t('notify.body')}</p>
        </div>

        <div className={`${row} flex-col !items-stretch`}>
          <div className="flex items-center gap-3">
            <span className={`${icon} bg-[#EEF1E6] text-emerald`}><MosqueIcon size={18} /></span>
            <span className="flex-1"><span className="block text-sm font-bold">{t('notify.prayers')}</span><span className="block text-xs text-muted">{t('notify.prayersNote')}</span></span>
          </div>
          <div className="mt-2.5 grid grid-cols-5 gap-1.5">
            {PRAYERS.filter((p) => p.isPrayer).map((p) => {
              const k = p.key as FivePrayers
              const on = prefs.prayers[k]
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => setPrefs({ ...prefs, prayers: { ...prefs.prayers, [k]: !on } })}
                  className={`h-10 rounded-xl text-xs font-bold ${on ? 'bg-emerald text-ivory' : 'border border-hair bg-paper text-muted'}`}>
                  {p.so}
                </button>
              )
            })}
          </div>
        </div>

        <div className={row}>
          <span className={`${icon} bg-[#FBF5E2] text-gold-ink`}>☀️</span>
          <span className="flex-1"><span className="block text-sm font-bold">{t('notify.morning')}</span><span className="block text-xs text-muted">{t('notify.morningNote', { n: prefs.morningOffset })}</span></span>
          <Switch on={prefs.morning} onChange={(v) => setPrefs({ ...prefs, morning: v })} label={t('notify.morning')} />
        </div>
        <div className={row}>
          <span className={`${icon} bg-[#FBF5E2] text-gold-ink`}><MoonIcon size={18} /></span>
          <span className="flex-1"><span className="block text-sm font-bold">{t('notify.evening')}</span><span className="block text-xs text-muted">{t('notify.eveningNote', { n: prefs.eveningOffset })}</span></span>
          <Switch on={prefs.evening} onChange={(v) => setPrefs({ ...prefs, evening: v })} label={t('notify.evening')} />
        </div>
        <div className={row}>
          <span className={`${icon} bg-[#EEF1E6] text-emerald`}><BookIcon size={18} /></span>
          <span className="flex-1"><span className="block text-sm font-bold">{t('notify.khatma')}</span><Link to="/khatmiga" className="block text-xs text-gold-ink">{t('notify.khatmaNote')}</Link></span>
          <Switch on={prefs.khatma} onChange={(v) => setPrefs({ ...prefs, khatma: v })} label={t('notify.khatma')} />
        </div>

        {showIOS && (
          <div role="note" className="rounded-2xl border border-[#EADBA6] bg-[#FBF5E2] p-3">
            <p className="m-0 text-[13px] font-extrabold text-[#5C4A10]">{t('notify.iosTitle')}</p>
            <p className="m-0 mt-1 mb-2 text-xs leading-normal text-[#5C4A10]">{t('notify.iosBody')}</p>
            <ol className="m-0 pl-[18px] text-xs leading-relaxed text-[#3B300A]">{tList('notify.iosSteps').map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
        )}

        {status === 'not-configured' && <p role="status" className="m-0 rounded-xl bg-[#F3ECDC] px-3 py-2.5 text-xs leading-normal">{t('notify.notConfigured')}</p>}
        {status === 'unsupported' && <p role="status" className="m-0 rounded-xl bg-[#F3ECDC] px-3 py-2.5 text-xs leading-normal">{t('notify.unsupported')}</p>}
        {status === 'denied' && <p role="alert" className="m-0 rounded-xl bg-[#F8E1D6] px-3 py-2.5 text-xs leading-normal text-[#7A2A0C]">{t('notify.denied')}</p>}
        {status === 'error' && <p role="alert" className="m-0 rounded-xl bg-[#F8E1D6] px-3 py-2.5 text-xs text-[#7A2A0C]">{t('notify.error')}</p>}
        {msg && <p role="status" className="m-0 rounded-xl bg-[#EEF1E6] px-3 py-2.5 text-xs text-emerald">{msg}</p>}

        <div className="mt-1 flex flex-col gap-2 pb-2">
          {status === 'on' ? (
            <>
              <p className="m-0 text-center text-sm font-bold text-emerald">{t('notify.on')}</p>
              <button type="button" onClick={test} className="h-12 rounded-2xl bg-emerald font-extrabold text-ivory">{t('notify.test')}</button>
              <button type="button" onClick={off} className="h-11 rounded-2xl border border-hair font-bold text-[#4A473C]">{t('notify.turnOff')}</button>
            </>
          ) : (
            <>
              <button type="button" onClick={allow} disabled={status === 'busy' || status === 'unsupported' || status === 'not-configured' || status === 'denied'}
                className="h-[52px] rounded-2xl bg-emerald text-[15px] font-extrabold text-ivory disabled:opacity-50">
                {t('notify.allow')}
              </button>
              <Link to="/" className="flex h-12 items-center justify-center rounded-2xl text-sm font-bold text-emerald no-underline">{t('notify.notNow')}</Link>
            </>
          )}
          <p className="m-0 text-center text-xs text-muted">{t('notify.inApp')}</p>
        </div>
      </main>
    </>
  )
}
