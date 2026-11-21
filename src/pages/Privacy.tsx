import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { t, tList } from '../i18n'
import { deleteAccount, signOut, useAccount } from '../lib/account'
import { authCode, authMessage } from '../lib/authMessages'
import { StarPattern } from '../components/StarPattern'

const Section = ({ title, children, tone = 'plain' }: { title: string; children: ReactNode; tone?: 'plain' | 'warn' }) => (
  <section className={tone === 'warn' ? 'rounded-[18px] border border-[#EADBA6] bg-[#FBF5E2] p-3.5' : 'card p-3.5'}>
    <h2 className={`m-0 mb-2 font-serif text-base font-semibold ${tone === 'warn' ? 'text-[#5C4A10]' : 'text-emerald'}`}>{title}</h2>
    {children}
  </section>
)

/** Privacy policy + the user's account (sign out / delete). */
export default function Privacy() {
  const navigate = useNavigate()
  const [acc] = useAccount()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)
  const [askPassword, setAskPassword] = useState(false)
  const [password, setPassword] = useState('')

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  const onSignOut = async () => {
    if (!acc || !window.confirm(t('account.signOutConfirm'))) return
    await signOut(acc)
    navigate('/')
  }

  const runDelete = async () => {
    if (!acc) return
    setBusy(true); setMsg(null)
    try {
      await deleteAccount(acc, password || undefined)
      setPassword('')
      setMsg({ text: t('privacy.deleted') })
      window.setTimeout(() => navigate('/'), 1200)
    } catch (e) {
      const code = authCode(e)
      if (code === 'auth/needs-password') setAskPassword(true)
      else {
        const m = code === 'unknown' ? t('privacy.deleteFail') : authMessage(code)
        if (m) setMsg({ text: m, bad: true })
      }
    } finally {
      setBusy(false)
    }
  }
  const onDelete = () => {
    if (window.confirm(t('privacy.deleteConfirm'))) void runDelete()
  }

  const accountLine = !acc ? '' : acc.kind === 'guest' ? t('account.guest')
    : `${t(acc.kind === 'google' ? 'account.signedInGoogle' : 'account.signedInEmail')}${acc.email ? ` · ${acc.email}` : ''}`

  return (
    <div className="mx-auto min-h-dvh max-w-[480px] bg-ivory pb-8 shadow-[0_0_80px_rgba(0,0,0,0.35)]">
      <header className="night relative flex flex-col gap-3.5 overflow-hidden rounded-b-[28px] px-[18px] pt-[max(16px,env(safe-area-inset-top))] pb-[22px]">
        <StarPattern opacity={0.09} />
        <button type="button" onClick={back} aria-label={t('welcome.back')} className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-ivory/[0.08] text-ivory">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="relative">
          <p className="eyebrow m-0 !text-gold-soft">DIIN</p>
          <h1 className="m-0 mt-1 font-serif text-[26px] font-semibold">{t('privacy.title')}</h1>
          <p className="m-0 mt-1.5 text-[13px] text-[#C9D6CF]">{t('privacy.subtitle')}</p>
        </div>
      </header>

      <main className="flex flex-col gap-3 px-[18px] pt-[18px]">
        {acc && (
          <Section title={t('account.title')}>
            <p className="m-0 text-[15px] font-extrabold text-ink">{acc.name}</p>
            <p className="m-0 mt-0.5 text-[12.5px] break-all text-muted">{accountLine}</p>
            <button type="button" onClick={onSignOut} className="mt-3 h-11 rounded-xl border border-hair bg-paper px-4 text-[13px] font-bold text-emerald">{t('account.signOut')}</button>
          </Section>
        )}

        <Section title={t('privacy.whatTitle')}>
          <ul className="m-0 pl-[18px] text-[13px] leading-relaxed text-[#3D3A30]">{tList('privacy.what').map((s) => <li key={s}>{s}</li>)}</ul>
        </Section>
        <Section title={t('privacy.whyTitle')}><p className="m-0 text-[13px] leading-relaxed text-[#3D3A30]">{t('privacy.why')}</p></Section>
        <Section title={t('privacy.whoTitle')}><p className="m-0 text-[13px] leading-relaxed text-[#3D3A30]">{t('privacy.who')}</p></Section>
        <Section title={t('privacy.passwordTitle')}><p className="m-0 text-[13px] leading-relaxed text-[#3D3A30]">{t('privacy.password')}</p></Section>
        <Section title={t('privacy.placeTitle')}><p className="m-0 text-[13px] leading-relaxed text-[#3D3A30]">{t('privacy.place')}</p></Section>

        {acc && (
          <Section title={t('privacy.deleteTitle')} tone="warn">
            <p className="m-0 mb-2.5 text-[13px] leading-relaxed text-[#5C4A10]">{t('privacy.deleteBody')}</p>
            {askPassword ? (
              <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (password) void runDelete() }}>
                <label htmlFor="del-pass" className="text-[13px] font-extrabold text-[#5C4A10]">{t('privacy.deletePassword')}</label>
                <input id="del-pass" type="password" autoComplete="current-password" value={password} onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                  className="h-11 rounded-xl border border-[#EADBA6] bg-paper px-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/40" />
                <button type="submit" disabled={busy || !password} className="h-11 rounded-xl border-[1.5px] border-[#8A3A12] bg-transparent px-4 text-[13px] font-extrabold text-[#8A3A12] disabled:opacity-60">{t('privacy.deleteAgain')}</button>
              </form>
            ) : (
              <button type="button" onClick={onDelete} disabled={busy} className="h-11 rounded-xl border-[1.5px] border-[#8A3A12] bg-transparent px-4 text-[13px] font-extrabold text-[#8A3A12] disabled:opacity-60">{t('privacy.deleteBtn')}</button>
            )}
          </Section>
        )}
        {msg && <p role={msg.bad ? 'alert' : 'status'} className={`m-0 rounded-xl px-3 py-2.5 text-[13px] font-bold ${msg.bad ? 'bg-[#F8E1D6] text-[#7A2A0C]' : 'bg-[#EEF1E6] text-emerald'}`}>{msg.text}</p>}
      </main>
    </div>
  )
}
