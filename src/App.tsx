import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LocationProvider } from './lib/location'
import { PlayerProvider } from './lib/player'
import { NotifySync } from './components/NotifySync'
import Home from './pages/Home'
import { t } from './i18n'

// every screen except Home is loaded on first visit (smaller start-up, faster first paint)
const Quran = lazy(() => import('./pages/Quran'))
const Adhkar = lazy(() => import('./pages/Adhkar'))
const AdhkarSession = lazy(() => import('./pages/AdhkarSession'))
const Prayer = lazy(() => import('./pages/Prayer'))
const Khatma = lazy(() => import('./pages/Khatma'))
const Notifications = lazy(() => import('./pages/Notifications'))

const Loading = () => <p role="status" className="m-0 py-16 text-center text-sm text-muted">{t('common.loading')}</p>

export default function App() {
  return (
    <LocationProvider>
      <PlayerProvider>
        <BrowserRouter>
          <NotifySync />
          <Suspense fallback={<Loading />}>
            <Routes>
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
          </Suspense>
        </BrowserRouter>
      </PlayerProvider>
    </LocationProvider>
  )
}
