import { describe, expect, it } from 'vitest'
import { authMessage, looksLikeEmail } from './authMessages'
import { t } from '../i18n'

describe('sign-in messages', () => {
  it('uses one message for wrong email and wrong password', () => {
    const m = t('auth.wrongCredentials')
    expect(authMessage('auth/invalid-credential')).toBe(m)
    expect(authMessage('auth/wrong-password')).toBe(m)
    expect(authMessage('auth/user-not-found')).toBe(m)
  })
  it('shows nothing when the Google window was simply closed', () => {
    expect(authMessage('auth/popup-closed-by-user')).toBeNull()
  })
  it('falls back to a general Somali message', () => {
    expect(authMessage('auth/something-new')).toBe(t('auth.generic'))
    expect(t('auth.generic')).not.toBe('auth.generic')
  })
  it('checks the shape of an email', () => {
    expect(looksLikeEmail('cabdi@gmail.com')).toBe(true)
    expect(looksLikeEmail('cabdi@gmail')).toBe(false)
    expect(looksLikeEmail('cabdi gmail.com')).toBe(false)
    expect(looksLikeEmail('@gmail.com')).toBe(false)
  })
})
