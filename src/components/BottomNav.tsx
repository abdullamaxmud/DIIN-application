import { NavLink, useLocation } from 'react-router-dom'
import { t } from '../i18n'
import { BeadsIcon, BookIcon, HomeIcon, MosqueIcon } from './Icons'

const items = [
  { to: '/', label: 'nav.home', Icon: HomeIcon, end: true },
  { to: '/quraanka', label: 'nav.quran', Icon: BookIcon, end: false },
  { to: '/adkaarta', label: 'nav.adhkar', Icon: BeadsIcon, end: false },
  { to: '/salaadda', label: 'nav.prayer', Icon: MosqueIcon, end: false },
]

/** Floating dark pill navigation with a gold dot under the active tab. */
export function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] px-3.5 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <div className="flex h-[66px] items-center justify-around rounded-3xl border border-gold/20 bg-night/95 shadow-[var(--shadow-float)] backdrop-blur">
        {items.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 text-[10.5px] font-bold tracking-wide no-underline ${
                isActive || (to === '/salaadda' && pathname.startsWith('/qiblada')) ? 'text-gold-soft after:absolute after:bottom-0.5 after:h-1 after:w-1 after:rounded-full after:bg-gold' : 'text-[#9DB7AC]'
              }`
            }
          >
            <Icon />
            {t(label)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
