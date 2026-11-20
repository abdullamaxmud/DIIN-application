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
