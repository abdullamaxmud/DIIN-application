import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../i18n'
import { GOOGLE_CLIENT_ID, googleConfigured, loginGoogle, loginGuest } from '../lib/account'
import { StarPattern } from '../components/StarPattern'

interface GoogleId {
  accounts: { id: {
    initialize: (o: { client_id: string; callback: (r: { credential?: string }) => void; ux_mode?: string; use_fedcm_for_prompt?: boolean }) => void
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
  } }
}
declare global { interface Window { google?: GoogleId } }

let gsi: Promise<GoogleId> | null = null
/** Google's sign-in script, loaded only on this screen. */
function loadGoogle(): Promise<GoogleId> {
  return (gsi ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google)
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error('gsi')))
    s.onerror = () => { gsi = null; reject(new Error('gsi')) }
    document.head.appendChild(s)
  }))
}

const Mark = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <g fill="none" stroke="#C9A34E" strokeWidth="2.4" strokeLinejoin="round">
      <rect x="11" y="11" width="26" height="26" />
      <rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" />
    </g>
    <circle cx="24" cy="24" r="5" fill="#E9D49E" />
  </svg>
)

const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
)

/** First screen for a new user: sign in with Google, or continue with just a name. */
export default function Welcome() {
  const [step, setStep] = useState<'choose' | 'guest'>('choose')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const googleBox = useRef<HTMLDivElement>(null)
  const [googleReady, setGoogleReady] = useState(false)

  useEffect(() => {
    if (step !== 'choose' || !googleConfigured()) return
    let alive = true
    loadGoogle().then((g) => {
      if (!alive || !googleBox.current) return
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        use_fedcm_for_prompt: true,
        callback: async ({ credential }) => {
          if (!credential) return
          setBusy(true); setMsg('')
          try { await loginGoogle(credential) } catch { setMsg(t('welcome.googleFail')); setBusy(false) }
        },
      })
      g.accounts.id.renderButton(googleBox.current, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with',
        logo_alignment: 'center', locale: 'so', width: Math.min(400, googleBox.current.offsetWidth || 340),
      })
      setGoogleReady(true)
    }).catch(() => alive && setMsg(t('welcome.googleFail')))
    return () => { alive = false }
  }, [step])

  const startGuest = async () => {
    const n = name.replace(/\s+/g, ' ').trim()
    if (!n) { setMsg(t('welcome.nameNeeded')); return }
    setBusy(true); setMsg('')
    await loginGuest(n.slice(0, 40))
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-ivory shadow-[0_0_80px_rgba(0,0,0,0.35)]">
      <header className="night relative flex h-[300px] flex-none flex-col items-center justify-center gap-3.5 overflow-hidden rounded-b-[36px] pt-[env(safe-area-inset-top)] text-ivory">
        <StarPattern opacity={0.09} />
        <span className="relative flex h-[84px] w-[84px] items-center justify-center rounded-full border border-gold/35 bg-gold-soft/[0.06] shadow-[0_0_0_12px_rgba(201,163,78,0.08)]">
          <Mark size={56} />
        </span>
        <h1 className="relative m-0 font-serif text-[30px] font-semibold tracking-tight">{t('welcome.title')}</h1>
        <p className="relative m-0 font-serif text-[15px] text-gold-soft italic">{t('welcome.tagline')}</p>
      </header>

      <main className="flex flex-1 flex-col gap-3.5 px-[22px] pt-[22px] pb-[max(22px,env(safe-area-inset-bottom))]">
        {step === 'choose' ? (
          <>
            <p className="m-0 text-center text-[14.5px] leading-relaxed text-[#4A473C]">{t('welcome.body')}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              <li className="card flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-[#EEF1E6]" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D3B2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
                </span>
                <span className="text-[13.5px] font-bold">{t('welcome.saved')}</span>
              </li>
              <li className="card flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-[#FBF5E2]" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A6A1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
                </span>
                <span className="text-[13.5px] font-bold">{t('welcome.anyPhone')}</span>
              </li>
            </ul>

            <div className="mt-auto flex flex-col gap-2.5">
              {googleConfigured() ? (
                <div className="relative flex min-h-[52px] items-center justify-center">
                  {!googleReady && (
                    <span className="absolute inset-0 flex items-center justify-center gap-3 rounded-2xl border border-[#DADCE0] bg-white text-[15px] font-bold text-[#1F1F1F]"><GoogleG />{t('welcome.google')}</span>
                  )}
                  <div ref={googleBox} className="w-full [&>div]:mx-auto" aria-busy={!googleReady} />
                </div>
              ) : (
                <>
                  <button type="button" disabled aria-describedby="g-soon" className="flex h-[52px] items-center justify-center gap-3 rounded-2xl border border-[#DADCE0] bg-white text-[15px] font-bold text-[#1F1F1F] opacity-60">
                    <GoogleG />{t('welcome.google')}
                  </button>
                  <p id="g-soon" className="m-0 text-center text-xs text-muted">{t('welcome.googleSoon')}</p>
                </>
              )}
              <button type="button" onClick={() => { setStep('guest'); setMsg('') }} disabled={busy}
                className="h-[50px] rounded-2xl border-[1.5px] border-emerald bg-transparent text-[14.5px] font-extrabold text-emerald">
                {t('welcome.guest')}
              </button>
              {msg && <p role="alert" className="m-0 rounded-xl bg-[#F8E1D6] px-3 py-2 text-center text-xs font-bold text-[#7A2A0C]">{msg}</p>}
              {busy && <p role="status" className="m-0 text-center text-xs text-muted">{t('welcome.busy')}</p>}
              <Link to="/asturnaanta" className="flex min-h-11 items-center self-center text-[12.5px] font-bold text-umber">{t('welcome.privacy')}</Link>
            </div>
          </>
        ) : (
          <form className="flex flex-1 flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); void startGuest() }}>
            <button type="button" onClick={() => { setStep('choose'); setMsg('') }} aria-label={t('welcome.back')}
              className="flex h-11 w-11 items-center justify-center self-start rounded-xl border border-hair bg-paper text-emerald">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nm" className="text-[13px] font-extrabold text-emerald">{t('welcome.nameLabel')}</label>
              <input id="nm" type="text" autoComplete="name" autoFocus maxLength={40} value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)}
                placeholder={t('welcome.namePlaceholder')}
                className="h-[50px] rounded-[14px] border border-hair bg-paper px-3.5 text-[15px] font-semibold text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/40" />
            </div>
            <p className="m-0 rounded-xl bg-[#FBF5E2] px-3 py-2.5 text-[12.5px] leading-normal text-[#5C4A10]">{t('welcome.guestNote')}</p>
            {msg && <p role="alert" className="m-0 text-xs font-bold text-[#7A2A0C]">{msg}</p>}
            <div className="mt-auto flex flex-col gap-2.5">
              <button type="submit" disabled={busy} className="h-[52px] rounded-2xl bg-emerald text-[15px] font-extrabold text-ivory disabled:opacity-60">
                {busy ? t('welcome.busy') : t('welcome.start')}
              </button>
              <Link to="/asturnaanta" className="flex min-h-11 items-center self-center text-[12.5px] font-bold text-umber">{t('welcome.privacy')}</Link>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
