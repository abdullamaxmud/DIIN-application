import { useEffect, useRef, useState } from 'react'
import { t, tList } from '../i18n'
import { useInstall } from '../lib/install'
import { DownloadIcon } from './Icons'

/** "Soo Degso App-ka": native prompt on Chrome/Edge/Android, step-by-step sheet on iPhone; hidden once installed. */
export function InstallButton() {
  const { mode, install } = useInstall()
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  if (mode === 'installed') return null

  const onClick = async () => {
    if (!(await install())) setOpen(true)
  }

  const steps = mode === 'ios' ? tList('install.iosSteps') : tList('install.androidSteps')
  return (
    <>
      <button type="button" onClick={onClick} className="flex h-10 items-center gap-1.5 rounded-full border border-gold/60 bg-gold/10 px-3.5 text-[12.5px] font-bold text-gold-soft">
        <DownloadIcon />
        {t('home.install')}
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-labelledby="inst-t"
        className="m-0 mt-auto w-full max-w-none border-none bg-transparent p-0 backdrop:bg-night/60"
      >
        <section className="mx-auto max-w-[480px] rounded-t-[28px] border-t border-hair bg-paper px-5 pt-5 pb-[max(28px,env(safe-area-inset-bottom))] text-ink">
          <div className="flex items-center justify-between">
            <h2 id="inst-t" className="m-0 font-serif text-[22px] font-semibold text-emerald">{t('install.title')}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label={t('common.close')} className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F3ECDC]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <p className="m-0 mt-2 mb-3.5 text-[13px] leading-normal text-muted">{t('install.body')}</p>
          <div className={`rounded-2xl px-3.5 py-3 ${mode === 'ios' ? 'bg-[#F8EFD8]' : 'bg-[#EEF3EE]'}`}>
            <p className="m-0 mb-1 text-[13px] font-extrabold">{mode === 'ios' ? t('install.iosTitle') : t('install.androidTitle')}</p>
            <ol className="m-0 pl-[18px] text-[13px] leading-relaxed">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="mt-3.5 h-[52px] w-full rounded-2xl bg-emerald text-[15px] font-extrabold text-ivory">{t('install.ok')}</button>
        </section>
      </dialog>
    </>
  )
}
