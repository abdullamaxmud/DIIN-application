import { useEffect, useState } from 'react'
import { isIOS, isStandalone } from './push'

// The browser fires `beforeinstallprompt` once, early — capture it at module load so the
// install button works even if Home mounts later.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((f) => f())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((f) => f())
  })
}

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'manual'

export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force((n) => n + 1)
    listeners.add(f)
    const mq = window.matchMedia?.('(display-mode: standalone)')
    mq?.addEventListener?.('change', f)
    return () => { listeners.delete(f); mq?.removeEventListener?.('change', f) }
  }, [])

  const mode: InstallMode = isStandalone() ? 'installed' : deferred ? 'prompt' : isIOS() ? 'ios' : 'manual'

  /** Shows the native install dialog when the browser offers one. Returns false when we must show instructions. */
  const install = async (): Promise<boolean> => {
    if (!deferred) return false
    await deferred.prompt()
    await deferred.userChoice.catch(() => null)
    deferred = null
    force((n) => n + 1)
    return true
  }
  return { mode, install }
}
