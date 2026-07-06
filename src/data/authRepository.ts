import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
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

/**
 * Web 版用 signInWithPopup（瀏覽器彈窗），RN 沒有對應 API。改用 `expo-auth-session` 的
 * `useIdTokenAuthRequest` hook 取得 Google id token（見 LoginScreen.tsx），這裡只負責
 * 拿到 id token 後換成 Firebase User，跟其他函式一樣回傳 `Promise<User>`，呼叫端不用改。
 * 取得 id token 的流程是 hook（不能放在這個檔案，這層不能有 UI 依賴），故拆成兩步。
 */
export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  const cred = await signInWithCredential(requireAuth(), GoogleAuthProvider.credential(idToken));
  return cred.user;
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
