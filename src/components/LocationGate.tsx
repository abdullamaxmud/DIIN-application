import { t, tList } from '../i18n'
import { useLocation } from '../lib/location'
import { PinIcon } from './Icons'

/** Full "turn location on" screen. Shown instead of prayer times until a real GPS fix exists. */
export function LocationGate() {
  const { status, request } = useLocation()
  const denied = status === 'denied'
  return (
    <div className="flex flex-col gap-4 px-1 pt-2 text-center">
      <span className="mx-auto flex h-[92px] w-[92px] flex-none items-center justify-center rounded-full bg-gold shadow-[0_0_0_14px_rgba(201,163,78,0.18)]">
        <PinIcon size={44} className="text-night" />
      </span>
      <h1 className="m-0 mt-2 font-serif text-[25px] font-semibold">{t('prayer.gateTitle')}</h1>
      <p className="m-0 text-sm leading-relaxed text-[#D9E2D6]">{t('prayer.gateBody')}</p>

      {status === 'unsupported' ? (
        <p role="status" className="m-0 rounded-2xl bg-[#11463A] px-3 py-2.5 text-[13px]">{t('prayer.unsupported')}</p>
      ) : status === 'searching' ? (
        <p role="status" className="m-0 flex items-center justify-center gap-2 text-sm font-bold text-gold-soft">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold-soft border-t-transparent" aria-hidden="true" />
          {t('prayer.searching')}
        </p>
      ) : (
        <button type="button" onClick={request} className="h-[54px] rounded-2xl bg-gold text-base font-extrabold text-night">
          {denied ? t('prayer.retry') : t('prayer.turnOn')}
        </button>
      )}

      {denied && (
        <div role="status" className="rounded-[18px] bg-paper px-4 py-3.5 text-left text-ink">
          <p className="m-0 mb-2 text-sm font-extrabold text-[#8A2C0D]">{t('prayer.notOn')}</p>
          <p className="m-0 mb-1 text-[13px] font-extrabold">{t('prayer.android')}:</p>
          <ol className="m-0 mb-2.5 pl-[18px] text-[13px] leading-relaxed text-[#2D2B22]">
            {tList('prayer.androidSteps').map((s) => <li key={s}>{s}</li>)}
          </ol>
          <p className="m-0 mb-1 text-[13px] font-extrabold">{t('prayer.iphone')}:</p>
          <ol className="m-0 pl-[18px] text-[13px] leading-relaxed text-[#2D2B22]">
            {tList('prayer.iphoneSteps').map((s) => <li key={s}>{s}</li>)}
          </ol>
          <p className="m-0 mt-2.5 text-xs text-muted">{t('prayer.comeBack')}</p>
        </div>
      )}
      <p className="m-0 text-xs text-[#9FC2B2]">{t('prayer.privacy')}</p>
    </div>
  )
}
