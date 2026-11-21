import { t } from '../i18n'

const KEYS: Record<string, string> = {
  'auth/invalid-credential': 'wrongCredentials',
  'auth/invalid-login-credentials': 'wrongCredentials',
  'auth/wrong-password': 'wrongCredentials',
  'auth/user-not-found': 'wrongCredentials',
  'auth/invalid-email': 'invalidEmail',
  'auth/email-already-in-use': 'emailTaken',
  'auth/weak-password': 'weakPassword',
  'auth/password-does-not-meet-requirements': 'weakPassword',
  'auth/too-many-requests': 'tooMany',
  'auth/network-request-failed': 'network',
  'auth/popup-blocked': 'popupBlocked',
  'auth/account-exists-with-different-credential': 'otherMethod',
  'auth/user-disabled': 'disabled',
  'auth/user-mismatch': 'mismatch',
}

/** Somali message for a Firebase error; null when the user simply closed the Google window. */
export function authMessage(code: string): string | null {
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/user-cancelled') return null
  return t(`auth.${KEYS[code] ?? 'generic'}`)
}

/** Firebase error code from any thrown value. */
export const authCode = (e: unknown) =>
  (e as { code?: string })?.code ?? (e instanceof Error && e.message.startsWith('auth/') ? e.message : 'unknown')

/** Basic shape check before asking the server; the emailed link is the real proof. */
export const looksLikeEmail = (s: string) => s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)

export const MIN_PASSWORD = 8
