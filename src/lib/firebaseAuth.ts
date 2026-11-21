// Firebase Authentication (email + password with a verified inbox, and Google).
// Loaded only on the sign-in and account screens, so it never slows the rest of the app.
import { initializeApp } from '@firebase/app'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  initializeAuth,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from '@firebase/auth'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
})

const auth = initializeAuth(app, { persistence: browserLocalPersistence, popupRedirectResolver: browserPopupRedirectResolver })

const googleProvider = () => {
  const p = new GoogleAuthProvider()
  p.setCustomParameters({ prompt: 'select_account' })
  return p
}

/** After the link in the email, come back to DIIN. */
const verifyLink = () => ({ url: `${window.location.origin}/` })

const currentUser = async (): Promise<User | null> => {
  await auth.authStateReady()
  return auth.currentUser
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(user, { displayName: name })
  await sendEmailVerification(user, verifyLink())
  return user.email ?? email
}

/** Returns true when the email is already verified. */
export async function signInWithEmail(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user.emailVerified
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider())
}

export async function resendVerification() {
  const user = await currentUser()
  if (user) await sendEmailVerification(user, verifyLink())
}

/** Asks Firebase again whether the signed-in user has opened the verification link. */
export async function isVerifiedNow() {
  const user = await currentUser()
  if (!user) return false
  await reload(user)
  return user.emailVerified
}

/** The sign-in left open on this device (for example while waiting for the email link). */
export async function pendingSignIn(): Promise<{ email: string; verified: boolean } | null> {
  const user = await currentUser()
  if (!user?.email) return null
  try { await reload(user) } catch { /* offline: use what we know */ }
  return { email: user.email, verified: user.emailVerified }
}

/** A fresh ID token that includes the latest name and verified status. */
export async function freshIdToken() {
  const user = await currentUser()
  if (!user) throw new Error('auth/no-current-user')
  return user.getIdToken(true)
}

/** "Use another email": removes the unverified sign-up so the address stays free for its real owner. */
export async function cancelUnverified() {
  const user = await currentUser()
  if (!user) return
  if (!user.emailVerified) {
    try { await deleteUser(user); return } catch { /* needs a recent login: just sign out */ }
  }
  await signOut(auth)
}

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email, verifyLink())

export const signOutFirebase = () => signOut(auth)

/** Firebase asks for a recent login before deleting an account. */
export async function confirmIdentity(kind: 'google' | 'email', accountId: string | null, email: string | null, password?: string) {
  let user = await currentUser()
  if (user) {
    const age = Date.now() - Date.parse((await user.getIdTokenResult()).authTime)
    if (age < 4 * 60_000) { assertSame(user, accountId); return }
  }
  if (kind === 'google') {
    if (user) await reauthenticateWithPopup(user, googleProvider())
    else user = (await signInWithPopup(auth, googleProvider())).user
  } else {
    if (!password || !email) throw new Error('auth/needs-password')
    if (user) await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password))
    else user = (await signInWithEmailAndPassword(auth, email, password)).user
  }
  assertSame(user, accountId)
}

function assertSame(user: User, accountId: string | null) {
  if (accountId !== `f:${user.uid}`) throw new Error('auth/user-mismatch')
}

export async function deleteFirebaseUser() {
  const user = await currentUser()
  if (user) await deleteUser(user)
}
