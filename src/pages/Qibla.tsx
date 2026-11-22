import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { t, tList } from '../i18n'
import { useLocation, type Fix } from '../lib/location'
import { compassPoint, distanceToKaaba, nextAligned, normalize, qiblaBearing, signedDiff } from '../lib/qibla'
import { declinationAt } from '../lib/declination'
import { useCompass } from '../lib/useCompass'
import { StarPattern } from '../components/StarPattern'
import { LocationGate } from '../components/LocationGate'
import { ChevronLeftIcon } from '../components/Icons'

const SIZE = 300
const C = SIZE / 2
const TICKS = Array.from({ length: 72 }, (_, i) => i * 5)
const CARDINALS = [0, 90, 180, 270]

/** Rotating compass card: north and the Kaaba marker turn together under a fixed pointer. */
function Dial({ rotation, bearing, aligned, label }: { rotation: number; bearing: number; aligned: boolean; label: string }) {
  const letters = tList('qibla.letters')
  return (
    <div role="img" aria-label={label} className="relative mx-auto aspect-square w-full max-w-[300px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx={C} cy={C} r={146} fill={aligned ? '#123F31' : '#0B2D24'} stroke={aligned ? '#E9D49E' : '#C9A34E'} strokeOpacity={aligned ? 1 : 0.55} strokeWidth={aligned ? 3 : 1.5} />
        <circle cx={C} cy={C} r={92} fill="none" stroke="#C9A34E" strokeOpacity="0.16" />
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50% 50%', transformBox: 'view-box' }}>
          {TICKS.map((d) => {
            const major = d % 30 === 0
            return <line key={d} x1={C} y1={10} x2={C} y2={major ? 24 : 17} stroke={d === 0 ? '#F2B8A0' : '#E9D49E'} strokeOpacity={major ? 0.95 : 0.4} strokeWidth={major ? 2 : 1} transform={`rotate(${d} ${C} ${C})`} />
          })}
          {CARDINALS.map((d, i) => (
            <text key={d} x={C} y={46} textAnchor="middle" fontSize="19" fontWeight="800" fill={d === 0 ? '#F2B8A0' : '#F6F1E6'} transform={`rotate(${d} ${C} ${C})`} fontFamily="Manrope, sans-serif">{letters[i]}</text>
          ))}
          <g transform={`rotate(${bearing} ${C} ${C})`}>
            <line x1={C} y1={C} x2={C} y2={82} stroke="#C9A34E" strokeWidth="3" strokeLinecap="round" />
            <g transform={`translate(${C - 17} 50)`}>
              <rect width="34" height="34" rx="4" fill="#071F19" stroke="#E9D49E" strokeWidth="2" />
              <rect y="9" width="34" height="5" fill="#C9A34E" />
              <rect x="13" y="20" width="8" height="14" rx="1" fill="#C9A34E" />
            </g>
          </g>
        </g>
        <circle cx={C} cy={C} r={6} fill="#E9D49E" />
      </svg>
      <svg width="26" height="20" viewBox="0 0 26 20" className="absolute -top-3 left-1/2 -translate-x-1/2" aria-hidden="true">
        <path d="M13 20 L1 1 H25 Z" fill={aligned ? '#E9D49E' : '#F6F1E6'} stroke="#071F19" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function Compass({ fix }: { fix: Fix }) {
  const { status, heading, lowAccuracy, enable } = useCompass()
  const bearing = useMemo(() => qiblaBearing(fix.lat, fix.lng), [fix.lat, fix.lng])
  const km = useMemo(() => distanceToKaaba(fix.lat, fix.lng), [fix.lat, fix.lng])
  const declination = useMemo(() => declinationAt(fix.lat, fix.lng), [fix.lat, fix.lng])
  const [aligned, setAligned] = useState(false)
  const wasAligned = useRef(false)

  const live = status === 'running' && heading !== null
  const trueHeading = live ? heading + declination : 0
  const diff = live ? signedDiff(normalize(trueHeading), bearing) : 180

  useEffect(() => {
    const now = live && nextAligned(wasAligned.current, diff)
    if (now && !wasAligned.current) navigator.vibrate?.(60)
    wasAligned.current = now
    setAligned(now)
  }, [live, diff])

  const deg = Math.round(bearing) % 360
  const point = tList('qibla.points')[compassPoint(bearing)]
  const turn = Math.round(Math.abs(diff))

  return (
    <>
      <header className="night relative overflow-hidden rounded-b-[32px] px-4 pt-[max(14px,env(safe-area-inset-top))] pb-6">
        <StarPattern opacity={0.1} />
        <div className="relative flex items-center gap-2">
          <Link to="/salaadda" aria-label={t('qibla.back')} className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-ivory/[0.08] text-ivory"><ChevronLeftIcon /></Link>
          <div className="min-w-0">
            <h1 className="m-0 font-serif text-[24px] leading-tight font-semibold">{t('qibla.title')}</h1>
            <p className="m-0 text-xs text-mist">{t('qibla.subtitle')}</p>
          </div>
        </div>

        <div className="relative mt-6 px-3">
          <Dial rotation={live ? -trueHeading : 0} bearing={bearing} aligned={aligned} label={t('qibla.dialLabel', { deg, point })} />
        </div>

        <div className="relative mt-4 flex min-h-[74px] flex-col items-center justify-center gap-2 text-center">
          {status === 'needs-permission' ? (
            <button type="button" onClick={enable} className="h-12 rounded-2xl bg-gold px-6 text-sm font-extrabold text-night">{t('qibla.enable')}</button>
          ) : status === 'starting' || (status === 'running' && !live) ? (
            <p role="status" className="m-0 text-sm font-bold text-gold-soft">{t('qibla.starting')}</p>
          ) : status === 'denied' ? (
            <p role="alert" className="m-0 rounded-xl bg-[#F8E1D6] px-3 py-2 text-[13px] leading-snug font-bold text-[#7A2A0C]">{t('qibla.denied')}</p>
          ) : status === 'unavailable' ? (
            <p role="status" className="m-0 rounded-xl bg-ivory/10 px-3 py-2 text-[13px] leading-snug font-bold text-ivory">{t('qibla.unavailable', { deg })}</p>
          ) : aligned ? (
            <p role="status" className="m-0 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-[15px] font-extrabold text-night">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
              {t('qibla.aligned')}
            </p>
          ) : (
            <p className="m-0 flex items-center gap-2 font-serif text-[21px] font-semibold">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E9D49E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: diff < 0 ? 'scaleX(-1)' : undefined }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              {t(diff > 0 ? 'qibla.turnRight' : 'qibla.turnLeft', { n: turn })}
            </p>
          )}
        </div>
      </header>

      <main className="flex flex-col gap-2.5 px-4 pt-3.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="card px-3.5 py-3">
            <p className="eyebrow m-0">{t('qibla.direction')}</p>
            <p className="m-0 mt-1 font-serif text-[25px] leading-none font-semibold text-emerald tabular-nums">{deg}°</p>
            <p className="m-0 mt-1 text-xs font-bold text-muted">{point}</p>
          </div>
          <div className="card px-3.5 py-3">
            <p className="eyebrow m-0">{t('qibla.distance')}</p>
            <p className="m-0 mt-1 font-serif text-[25px] leading-none font-semibold text-emerald tabular-nums">{Math.round(km).toLocaleString('en-US')}</p>
            <p className="m-0 mt-1 text-xs font-bold text-muted">{t('qibla.kmToKaaba')}</p>
          </div>
        </div>

        <section className={lowAccuracy ? 'rounded-[18px] border border-[#EADBA6] bg-[#FBF5E2] px-3.5 py-3' : 'card px-3.5 py-3'}>
          <h2 className="m-0 mb-1.5 text-[13px] font-extrabold text-emerald">{t(lowAccuracy ? 'qibla.calibrateNow' : 'qibla.tipsTitle')}</h2>
          <ul className="m-0 list-disc pl-[18px] text-[12.5px] leading-relaxed text-[#4A473C]">{tList('qibla.tips').map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
        <p className="m-0 px-1 text-center text-xs leading-normal text-muted">{t('qibla.source')}</p>
      </main>
    </>
  )
}

/** Qibla compass. Needs the GPS position, like the prayer times. */
export default function Qibla() {
  const { fix } = useLocation()
  if (!fix) {
    return (
      <div className="night relative min-h-dvh overflow-hidden px-[22px] pt-10 pb-32">
        <StarPattern opacity={0.12} />
        <div className="relative"><LocationGate /></div>
      </div>
    )
  }
  return <Compass fix={fix} />
}
