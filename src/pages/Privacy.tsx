import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { t, tList } from '../i18n'
import { deleteAccount, signOut, useAccount } from '../lib/account'
import { StarPattern } from '../components/StarPattern'

const Section = ({ title, children, tone = 'plain' }: { title: string; children: React.ReactNode; tone?: 'plain' | 'warn' }) => (
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

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  const onSignOut = async () => {
    if (!acc || !window.confirm(t('account.signOutConfirm'))) return
    await signOut(acc)
    navigate('/')
  }
  const onDelete = async () => {
    if (!acc || !window.confirm(t('privacy.deleteConfirm'))) return
    setBusy(true); setMsg(null)
    try {
      await deleteAccount(acc)
      setMsg({ text: t('privacy.deleted') })
      window.setTimeout(() => navigate('/'), 1200)
    } catch {
      setMsg({ text: t('privacy.deleteFail'), bad: true })
    } finally {
      setBusy(false)
    }
  }

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
            <p className="m-0 mt-0.5 text-[12.5px] text-muted">{acc.kind === 'google' ? `${t('account.signedInGoogle')}${acc.email ? ` · ${acc.email}` : ''}` : t('account.guest')}</p>
            <button type="button" onClick={onSignOut} className="mt-3 h-11 rounded-xl border border-hair bg-paper px-4 text-[13px] font-bold text-emerald">{t('account.signOut')}</button>
          </Section>
        )}

        <Section title={t('privacy.whatTitle')}>
          <ul className="m-0 pl-[18px] text-[13px] leading-relaxed text-[#3D3A30]">{tList('privacy.what').map((s) => <li key={s}>{s}</li>)}</ul>
        </Section>
        <Section title={t('privacy.whyTitle')}><p className="m-0 text-[13px] leading-relaxed text-[#3D3A30]">{t('privacy.why')}</p></Section>
        <Section title={t('privacy.whoTitle')}><p className="m-0 text-[13px] leading-relaxed text-[#3D3A30]">{t('privacy.who')}</p></Section>
        <Section title={t('privacy.placeTitle')}><p className="m-0 text-[13px] leading-relaxed text-[#3D3A30]">{t('privacy.place')}</p></Section>

        {acc && (
          <Section title={t('privacy.deleteTitle')} tone="warn">
            <p className="m-0 mb-2.5 text-[13px] leading-relaxed text-[#5C4A10]">{t('privacy.deleteBody')}</p>
            <button type="button" onClick={onDelete} disabled={busy} className="h-11 rounded-xl border-[1.5px] border-[#8A3A12] bg-transparent px-4 text-[13px] font-extrabold text-[#8A3A12] disabled:opacity-60">{t('privacy.deleteBtn')}</button>
          </Section>
        )}
        {msg && <p role={msg.bad ? 'alert' : 'status'} className={`m-0 rounded-xl px-3 py-2.5 text-[13px] font-bold ${msg.bad ? 'bg-[#F8E1D6] text-[#7A2A0C]' : 'bg-[#EEF1E6] text-emerald'}`}>{msg.text}</p>}
      </main>
    </div>
  )
}
