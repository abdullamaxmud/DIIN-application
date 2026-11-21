import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { t, tList } from '../i18n'
import { ApiError } from '../lib/api'
import { completeSignIn, firebaseConfigured, loadAuth, useAccount } from '../lib/account'
import { authCode, authMessage, looksLikeEmail, MIN_PASSWORD } from '../lib/authMessages'
import { StarPattern } from '../components/StarPattern'

type Mode = 'signup' | 'signin' | 'forgot' | 'verify'
type Fb = Awaited<ReturnType<typeof loadAuth>>

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

const inputClass = 'h-[50px] w-full rounded-[14px] border border-hair bg-paper px-3.5 text-[15px] font-semibold text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/40'

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-extrabold text-emerald">{label}</label>
      {children}
    </div>
  )
}

function PasswordInput({ id, value, onChange, autoComplete, placeholder }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} placeholder={placeholder} maxLength={128}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)} className={`${inputClass} pr-12`} />
      <button type="button" onClick={() => setShow(!show)} aria-label={t(show ? 'welcome.hidePassword' : 'welcome.showPassword')} aria-pressed={show}
        className="absolute top-[3px] right-[3px] flex h-11 w-11 items-center justify-center rounded-xl text-muted">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
          {show && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  )
}

/** First screen: sign in with Google, or with an email and password whose inbox has been verified. */
export default function Welcome() {
  const [acc] = useAccount()
  const [mode, setMode] = useState<Mode>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [justSent, setJustSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const fbRef = useRef<Fb | null>(null)
  const finishing = useRef(false)
  const configured = firebaseConfigured()

  const fb = async () => (fbRef.current ??= await loadAuth())
  const showError = (e: unknown, code?: string) => {
    const c = code ?? authCode(e)
    const m = e instanceof ApiError && e.status === 0 ? t('auth.network') : authMessage(c)
    setInfo('')
    setError(m ?? '')
  }

  /** Firebase confirmed the person: open the DIIN session (the app then replaces this screen). */
  const finish = useCallback(async () => {
    if (finishing.current) return
    finishing.current = true
    setBusy(true); setError('')
    try {
      await completeSignIn()
    } catch (e) {
      finishing.current = false
      setBusy(false)
      if (e instanceof ApiError && e.code === 'email-not-verified') { setMode('verify'); return }
      setError(e instanceof ApiError && e.status === 0 ? t('auth.network') : t('auth.generic'))
    }
  }, [])

  // load sign-in early (Google's window must open directly from the tap) and resume an open sign-in
  useEffect(() => {
    if (!configured) return
    let alive = true
    const id = window.setTimeout(async () => {
      try {
        const m = await fb()
        const open = await m.pendingSignIn()
        if (!alive || !open) return
        if (open.verified) void finish()
        else { setEmail(open.email); setMode('verify') }
      } catch { /* offline: the form still shows the message on submit */ }
    }, 150)
    return () => { alive = false; window.clearTimeout(id) }
  }, [configured, finish])

  // while waiting for the email link: notice it as soon as the person returns
  useEffect(() => {
    if (mode !== 'verify') return
    const check = async () => {
      if (document.visibilityState !== 'visible' || finishing.current) return
      try { if (await (await fb()).isVerifiedNow()) void finish() } catch { /* try again */ }
    }
    const id = window.setInterval(check, 4000)
    document.addEventListener('visibilitychange', check)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', check) }
  }, [mode, finish])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  const go = (m: Mode) => { setMode(m); setError(''); setInfo(''); setPassword('') }

  const onGoogle = async () => {
    setError(''); setInfo('')
    try {
      await (fbRef.current ?? (await fb())).signInWithGoogle()
      await finish()
    } catch (e) {
      showError(e)
    }
  }

  const onSubmit = async () => {
    const mail = email.trim()
    const person = name.replace(/\s+/g, ' ').trim()
    if (mode === 'signup' && !person) return setError(t('auth.needName'))
    if (!looksLikeEmail(mail)) return setError(t('auth.needEmail'))
    if (mode === 'signin' && !password) return setError(t('auth.needPassword'))
    if (mode === 'signup' && password.length < MIN_PASSWORD) return setError(t('auth.shortPassword'))
    setBusy(true); setError(''); setInfo('')
    try {
      const m = await fb()
      if (mode === 'forgot') {
        await m.resetPassword(mail)
        setInfo(t('welcome.forgotSent'))
      } else if (mode === 'signup') {
        setEmail(await m.signUpWithEmail(person.slice(0, 60), mail, password))
        setPassword(''); setJustSent(true); setCooldown(60); setMode('verify')
      } else if (await m.signInWithEmail(mail, password)) {
        setPassword('')
        await finish()
        return
      } else {
        setPassword(''); setJustSent(false); setMode('verify')
      }
    } catch (e) {
      if (mode === 'forgot' && authCode(e) === 'auth/user-not-found') setInfo(t('welcome.forgotSent'))
      else showError(e)
    }
    setBusy(false)
  }

  const onCheck = async () => {
    setBusy(true); setError(''); setInfo('')
    try {
      if (await (await fb()).isVerifiedNow()) { await finish(); return }
      setError(t('welcome.verifyNotYet'))
    } catch (e) { showError(e) }
    setBusy(false)
  }
  const onResend = async () => {
    setError(''); setInfo('')
    try {
      await (await fb()).resendVerification()
      setJustSent(true); setCooldown(60); setInfo(t('welcome.resent'))
    } catch (e) { showError(e) }
  }
  const onOtherEmail = async () => {
    try { await (await fb()).cancelUnverified() } catch { /* the form is still usable */ }
    setEmail(''); setJustSent(false); setCooldown(0); go('signup')
  }

  const messages = (
    <>
      {error && <p role="alert" className="m-0 rounded-xl bg-[#F8E1D6] px-3 py-2.5 text-[13px] leading-snug font-bold text-[#7A2A0C]">{error}</p>}
      {info && <p role="status" className="m-0 rounded-xl bg-[#EEF1E6] px-3 py-2.5 text-[13px] leading-snug font-bold text-emerald">{info}</p>}
    </>
  )
  const primary = 'h-[52px] w-full rounded-2xl bg-emerald text-[15px] font-extrabold text-ivory disabled:opacity-60'
  const privacy = <Link to="/asturnaanta" className="flex min-h-11 items-center self-center text-[12.5px] font-bold text-umber">{t('welcome.privacy')}</Link>
  const backBtn = (to: Mode) => (
    <button type="button" onClick={() => go(to)} aria-label={t('welcome.back')} className="flex h-11 w-11 items-center justify-center self-start rounded-xl border border-hair bg-paper text-emerald">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
    </button>
  )

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-ivory shadow-[0_0_80px_rgba(0,0,0,0.35)]">
      <header className="night relative flex h-[196px] flex-none flex-col items-center justify-center gap-2 overflow-hidden rounded-b-[32px] pt-[env(safe-area-inset-top)] text-ivory">
        <StarPattern opacity={0.09} />
        <span className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full border border-gold/35 bg-gold-soft/[0.06] shadow-[0_0_0_8px_rgba(201,163,78,0.08)]"><Mark size={42} /></span>
        <h1 className="relative m-0 font-serif text-[26px] font-semibold tracking-tight">{t('welcome.title')}</h1>
        <p className="relative m-0 font-serif text-sm text-gold-soft italic">{t('welcome.tagline')}</p>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-[22px] pt-[18px] pb-[max(14px,env(safe-area-inset-bottom))]">
        {!configured ? (
          <p role="alert" className="m-0 rounded-xl bg-[#F3ECDC] px-3 py-3 text-center text-[13px] font-bold">{t('welcome.notConfigured')}</p>
        ) : mode === 'verify' ? (
          <section aria-labelledby="v-title" className="flex flex-1 flex-col gap-3">
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF1E6] text-emerald" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
              </span>
              <h2 id="v-title" className="m-0 mt-2.5 font-serif text-[22px] font-semibold text-emerald">{t('welcome.verifyTitle')}</h2>
              {justSent ? (
                <p className="m-0 mt-1 text-[13.5px] text-[#4A473C]">{t('welcome.verifyBody')} <strong className="break-all text-ink">{email}</strong></p>
              ) : (
                <p className="m-0 mt-1 text-[13.5px] text-[#4A473C]"><strong className="break-all text-ink">{email}</strong><br />{t('welcome.verifyUnsent')}</p>
              )}
            </div>
            <ol className="card m-0 list-decimal py-3 pr-3 pl-8 text-[13.5px] leading-relaxed font-semibold">
              {tList('welcome.verifySteps').map((s) => <li key={s}>{s}</li>)}
            </ol>
            <p className="m-0 text-center text-xs text-muted">{t('welcome.verifySpam')}</p>
            {messages}
            <div className="mt-auto flex flex-col gap-2">
              <button type="button" onClick={onCheck} disabled={busy} className={primary}>{busy ? t('welcome.busy') : t('welcome.verifyCheck')}</button>
              <button type="button" onClick={onResend} disabled={cooldown > 0 || busy} className="h-12 rounded-2xl border-[1.5px] border-emerald bg-transparent text-sm font-extrabold text-emerald disabled:opacity-50">
                {cooldown > 0 ? t('welcome.resendIn', { n: cooldown }) : t('welcome.resend')}
              </button>
              <button type="button" onClick={onOtherEmail} disabled={busy} className="min-h-11 text-[13px] font-bold text-umber">{t('welcome.otherEmail')}</button>
            </div>
          </section>
        ) : mode === 'forgot' ? (
          <form noValidate className="flex flex-1 flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void onSubmit() }}>
            {backBtn('signin')}
            <div>
              <h2 className="m-0 font-serif text-[22px] font-semibold text-emerald">{t('welcome.forgotTitle')}</h2>
              <p className="m-0 mt-1 text-[13.5px] leading-relaxed text-[#4A473C]">{t('welcome.forgotBody')}</p>
            </div>
            <Field id="f-email" label={t('welcome.emailLabel')}>
              <input id="f-email" type="email" inputMode="email" autoComplete="email" value={email} placeholder={t('welcome.emailPlaceholder')} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} className={inputClass} />
            </Field>
            {messages}
            <button type="submit" disabled={busy} className={`${primary} mt-auto`}>{busy ? t('welcome.busy') : t('welcome.forgotSubmit')}</button>
          </form>
        ) : (
          <>
            {acc?.kind === 'guest' && <p role="note" className="m-0 rounded-xl bg-[#FBF5E2] px-3 py-2.5 text-center text-[12.5px] leading-normal font-bold text-[#5C4A10]">{t('welcome.guestUpgrade')}</p>}
            <div role="group" aria-label={t('welcome.tabsLabel')} className="grid grid-cols-2 gap-1 rounded-[14px] bg-sand p-1">
              {(['signup', 'signin'] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => go(m)}
                  className={`h-10 rounded-[10px] text-[13.5px] font-extrabold ${mode === m ? 'bg-paper text-emerald shadow-sm' : 'bg-transparent text-[#4A473C]'}`}>
                  {t(m === 'signup' ? 'welcome.signUp' : 'welcome.signIn')}
                </button>
              ))}
            </div>

            <button type="button" onClick={onGoogle} disabled={busy} className="flex h-[50px] items-center justify-center gap-3 rounded-2xl border border-[#DADCE0] bg-white text-[15px] font-bold text-[#1F1F1F] shadow-sm disabled:opacity-60">
              <GoogleG />{t('welcome.google')}
            </button>
            <div className="flex items-center gap-3 text-xs font-bold text-muted" aria-hidden="true"><span className="h-px flex-1 bg-hair" />{t('welcome.or')}<span className="h-px flex-1 bg-hair" /></div>

            <form noValidate className="flex flex-1 flex-col gap-2.5" onSubmit={(e) => { e.preventDefault(); void onSubmit() }}>
              {mode === 'signup' && (
                <Field id="a-name" label={t('welcome.nameLabel')}>
                  <input id="a-name" type="text" autoComplete="name" maxLength={60} value={name} placeholder={t('welcome.namePlaceholder')} onInput={(e) => setName((e.target as HTMLInputElement).value)} className={inputClass} />
                </Field>
              )}
              <Field id="a-email" label={t('welcome.emailLabel')}>
                <input id="a-email" type="email" inputMode="email" autoComplete="email" value={email} placeholder={t('welcome.emailPlaceholder')} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} className={inputClass} />
              </Field>
              <Field id="a-pass" label={t('welcome.passwordLabel')}>
                <PasswordInput id="a-pass" value={password} onChange={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? t('welcome.passwordNew') : undefined} />
              </Field>
              {mode === 'signup'
                ? <p className="m-0 text-xs leading-normal text-muted">{t('welcome.passwordNote')}</p>
                : <button type="button" onClick={() => go('forgot')} className="min-h-9 self-end text-[13px] font-bold text-gold-ink">{t('welcome.forgot')}</button>}
              {messages}
              <button type="submit" disabled={busy} className={`${primary} mt-auto`}>{busy ? t('welcome.busy') : t(mode === 'signup' ? 'welcome.submitSignUp' : 'welcome.submitSignIn')}</button>
            </form>
          </>
        )}
        {privacy}
      </main>
    </div>
  )
}
