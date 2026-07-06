import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

function requireAuth() {
  if (!auth) throw new Error('Firebase Auth is not configured');
  return auth;
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(requireAuth(), email, password);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(requireAuth(), email, password);
  return cred.user;
}

// Web 版用 signInWithPopup，這在 RN 沒有對應（沒有瀏覽器彈窗）。照 iOS 開發計畫，
// Google 登入延後處理——之後要做時需要 `@react-native-google-signin/google-signin`
// 取得原生 ID token，再用 `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))`
// 換成 Firebase User，跟這裡其他函式的介面（回傳 Promise<User>）保持一致即可，呼叫端不用改。
export async function signInWithGoogle(): Promise<User> {
  throw new Error('Google 登入尚未在 iOS 版實作（需要原生 Google Sign-In SDK），先用 Email/密碼登入');
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(requireAuth());
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(requireAuth(), email);
}

export function subscribeAuthState(onChange: (user: User | null) => void): () => void {
  return onAuthStateChanged(requireAuth(), onChange);
}
