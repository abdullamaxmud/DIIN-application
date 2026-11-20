import { Link } from 'react-router-dom'
import { t } from '../i18n'
import { formatGregorian, formatHijri } from '../lib/dates'
import { StarPattern, OrnamentDivider } from '../components/StarPattern'
import { BellIcon, BookIcon, CalendarCheckIcon, DiinMark, HeadphonesIcon, MoonIcon, PinIcon } from '../components/Icons'
import { InstallButton } from '../components/InstallButton'
import { HomePrayerArch } from '../components/HomePrayerArch'
import { AdhkarCard, ContinueReadingCard, PrayerSoonCard, WirdCard } from '../components/HomeCards'
import { useLocation } from '../lib/location'
import { regionFor } from '../lib/prayer'
import { useAccount } from '../lib/account'

const quick = [
  { to: '/quraanka?tab=akhri', label: 'home.quick.read', Icon: BookIcon },
  { to: '/quraanka?tab=dhageyso', label: 'home.quick.listen', Icon: HeadphonesIcon },
  { to: '/khatmiga', label: 'home.quick.khatma', Icon: CalendarCheckIcon },
  { to: '/ogeysiisyada', label: 'home.quick.notify', Icon: BellIcon },
]

export default function Home() {
  const now = new Date()
  const { fix } = useLocation()
  const [acc] = useAccount()
  return (
    <>
      <header className="night relative overflow-hidden rounded-b-[36px] px-[18px] pt-[max(18px,env(safe-area-inset-top))] pb-6">
        <StarPattern />
        <svg aria-hidden="true" width="140" height="140" viewBox="0 0 140 140" className="absolute -right-7 top-14 opacity-15">
          <path d="M96 20a52 52 0 1 0 0 100 44 44 0 1 1 0-100z" fill="#E9D49E" />
        </svg>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <DiinMark />
            <span className="font-serif text-[23px] font-semibold tracking-[0.22em]">{t('app.name')}</span>
          </div>
          <InstallButton />
        </div>

        <p className="relative mt-5 mb-0.5 font-serif text-[15px] italic text-gold-soft">{t('home.greeting')}{acc ? `, ${acc.name.split(' ')[0]}` : ''}</p>
        <p className="relative m-0 font-serif text-[26px] font-semibold tracking-tight">{formatGregorian(now)}</p>
        <div className="relative mt-2.5 flex flex-wrap gap-1.5">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-ivory/15 bg-ivory/10 px-3 text-xs font-bold">
            <MoonIcon className="text-gold-soft" />
            {formatHijri(now, fix?.zone)}
          </span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-ivory/15 bg-ivory/10 px-3 text-xs font-bold">
            <PinIcon className="text-gold-soft" />
            {fix ? `${t('prayer.myLocation')} · ${regionFor(fix.zone).country}` : t('home.locationOff')}
          </span>
        </div>

        <HomePrayerArch />
      </header>

      <main className="flex flex-col gap-3.5 px-4 pt-6">
        <PrayerSoonCard />
        <ContinueReadingCard />
        <WirdCard />
        <AdhkarCard />
        <OrnamentDivider />
        <nav aria-label="Gaaban" className="grid grid-cols-4 gap-2">
          {quick.map(({ to, label, Icon }) => (
            <Link key={label} to={to} className="group flex flex-col items-center gap-2 text-xs font-bold text-ink no-underline">
              <span className="flex h-[58px] w-[58px] items-center justify-center rounded-[20px] border border-hair bg-paper text-emerald shadow-[0_8px_20px_-14px_rgba(7,31,25,0.5)] group-hover:border-gold">
                <Icon />
              </span>
              {t(label)}
            </Link>
          ))}
        </nav>
        <Link to="/asturnaanta" className="mt-1 flex min-h-11 items-center justify-center gap-2 text-[12.5px] font-bold text-umber no-underline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
          {t('account.link')}
        </Link>
      </main>
    </>
  )
}
