import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes, useLocation as useRoute } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LocationProvider } from './lib/location'
import { PlayerProvider } from './lib/player'
import { NotifySync } from './components/NotifySync'
import { AppServices } from './components/AppServices'
import { needsSignIn, useAccount } from './lib/account'
import Home from './pages/Home'
import Welcome from './pages/Welcome'
import { UpdateBanner } from './components/UpdateBanner'
import { t } from './i18n'

/**
 * Lazy screen that survives an app update: after a new version is published, the old version's
 * screen files no longer exist, so a failed load reloads the page once to get the new version.
 */
function lazyPage<T extends { default: React.ComponentType }>(load: () => Promise<T>) {
  return lazy(() =>
    load().then(
      (m) => {
        try { sessionStorage.removeItem('diin.chunkReload') } catch { /* ignore */ }
        return m
      },
      (err) => {
        let reloaded = false
        try { reloaded = sessionStorage.getItem('diin.chunkReload') === '1'; sessionStorage.setItem('diin.chunkReload', '1') } catch { /* ignore */ }
        if (reloaded || !navigator.onLine) throw err
        window.location.reload()
        return new Promise<T>(() => {}) // the page is reloading
      },
    ),
  )
}

// every screen except Home and Welcome is loaded on first visit (smaller start-up, faster first paint)
const Quran = lazyPage(() => import('./pages/Quran'))
const Adhkar = lazyPage(() => import('./pages/Adhkar'))
const AdhkarSession = lazyPage(() => import('./pages/AdhkarSession'))
const Prayer = lazyPage(() => import('./pages/Prayer'))
const Khatma = lazyPage(() => import('./pages/Khatma'))
const Notifications = lazyPage(() => import('./pages/Notifications'))
const Privacy = lazyPage(() => import('./pages/Privacy'))
const Admin = lazyPage(() => import('./pages/Admin'))

const Loading = () => <p role="status" className="m-0 py-16 text-center text-sm text-muted">{t('common.loading')}</p>

/** Pages anyone can open without choosing Google / a name first. */
const OPEN = ['/asturnaanta', '/admin']

/** Everyone signs in first, with Google or a verified email. */
function Gate({ children }: { children: ReactNode }) {
  const [acc, , ready] = useAccount()
  const { pathname } = useRoute()
  if (!ready) return null
  if (needsSignIn(acc) && !OPEN.includes(pathname)) return <Welcome />
  return <>{children}</>
}

export default function App() {
  return (
    <LocationProvider>
      <PlayerProvider>
        <BrowserRouter>
          <NotifySync />
          <AppServices />
          <UpdateBanner />
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
