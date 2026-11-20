import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// fonts are bundled with the app (no Google request), so they also work offline
import '@fontsource/fraunces/latin-500.css'
import '@fontsource/fraunces/latin-600.css'
import '@fontsource/fraunces/latin-500-italic.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/manrope/latin-800.css'
import '@fontsource/amiri/arabic-400.css'
import '@fontsource/amiri/arabic-700.css'
import '@fontsource/amiri-quran/arabic-400.css'
import './styles/index.css'
import './lib/install' // captures beforeinstallprompt as early as possible
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// opening animation (index.html): shown for at least 1.8 s, tap to skip; short when motion is reduced
const splash = document.getElementById('splash')
if (splash) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const hide = () => {
    splash.classList.add('out')
    window.setTimeout(() => splash.remove(), 500)
  }
  splash.addEventListener('click', hide, { once: true })
  window.setTimeout(hide, Math.max(0, (reduced ? 300 : 1800) - performance.now()))
}
