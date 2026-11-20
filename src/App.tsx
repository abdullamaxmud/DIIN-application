import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes, useLocation as useRoute } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LocationProvider } from './lib/location'
import { PlayerProvider } from './lib/player'
import { NotifySync } from './components/NotifySync'
import { AppServices } from './components/AppServices'
import { useAccount } from './lib/account'
import Home from './pages/Home'
import Welcome from './pages/Welcome'
import { t } from './i18n'

// every screen except Home and Welcome is loaded on first visit (smaller start-up, faster first paint)
const Quran = lazy(() => import('./pages/Quran'))
const Adhkar = lazy(() => import('./pages/Adhkar'))
const AdhkarSession = lazy(() => import('./pages/AdhkarSession'))
const Prayer = lazy(() => import('./pages/Prayer'))
const Khatma = lazy(() => import('./pages/Khatma'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Admin = lazy(() => import('./pages/Admin'))

const Loading = () => <p role="status" className="m-0 py-16 text-center text-sm text-muted">{t('common.loading')}</p>

/** Pages anyone can open without choosing Google / a name first. */
const OPEN = ['/asturnaanta', '/admin']

/** New users first see the welcome screen (sign in with Google, or continue with a name). */
function Gate({ children }: { children: ReactNode }) {
  const [acc, , ready] = useAccount()
  const { pathname } = useRoute()
  if (!ready) return null
  if (!acc && !OPEN.includes(pathname)) return <Welcome />
  return <>{children}</>
}

export default function App() {
  return (
    <LocationProvider>
      <PlayerProvider>
        <BrowserRouter>
          <NotifySync />
          <AppServices />
          <Suspense fallback={<Loading />}>
            <Gate>
              <Routes>
                <Route path="asturnaanta" element={<Privacy />} />
                <Route path="admin" element={<Admin />} />
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="quraanka" element={<Quran />} />
                  <Route path="adkaarta" element={<Adhkar />} />
                  <Route path="adkaarta/:key" element={<AdhkarSession />} />
                  <Route path="salaadda" element={<Prayer />} />
                  <Route path="khatmiga" element={<Khatma />} />
                  <Route path="ogeysiisyada" element={<Notifications />} />
                  <Route path="*" element={<Home />} />
                </Route>
              </Routes>
            </Gate>
          </Suspense>
        </BrowserRouter>
      </PlayerProvider>
    </LocationProvider>
  )
}
