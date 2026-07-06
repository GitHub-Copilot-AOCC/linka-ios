import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth } from 'firebase/auth';
// `firebase/auth`（top-level firebase 套件的 wrapper）沒有把 "react-native" export 條件轉發出來，
// `@firebase/auth` 本身有（dist/rn/index.rn.d.ts 有這個 symbol），但 tsc 在 Node 環境下解析
// conditional exports 時仍然選到 "node" 條件而不是 "react-native"（純 tsc 檢查跟 Metro 實際
// bundling 的條件解析順序不一致，是已知的 TS+Metro 落差，不是我們程式碼寫錯）。實際跑在 Metro
// 底下這個 import 應該會正確拿到 RN 版本；這裡用 @ts-expect-error 壓過 tsc 的型別檢查，
// **上真機測 Google/Email 登入時務必確認登入狀態重開 App 後有沒有持久化，這行是唯一還沒被
// 實機驗證過的地方**。
// @ts-expect-error 見上方註解：tsc 解析 conditional exports 選錯條件，Metro 底下應該沒問題
import { getReactNativePersistence } from '@firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo 用 EXPO_PUBLIC_ 開頭的環境變數才會被打包進 client bundle（對應 Web 版的 VITE_ 前綴）。
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const firebaseApp = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const db = firebaseApp ? getFirestore(firebaseApp) : null;

// Auth 用 AsyncStorage 持久化登入狀態（對應 Web 版 IndexedDB persistence 的等價需求，
// 見 spec.md §5.11）。initializeAuth 每個 app instance 只能呼叫一次，Fast Refresh 時
// 重複呼叫會拋錯，這裡 catch 掉改用 getAuth 拿已初始化的 instance。
export const auth = firebaseApp
  ? (() => {
      try {
        return initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
      } catch {
        return getAuth(firebaseApp);
      }
    })()
  : null;

export const storage = firebaseApp ? getStorage(firebaseApp) : null;

// TODO(iOS)：Web 版用 enableIndexedDbPersistence 讓 Firestore 離線時仍能讀到快取資料
// （見 spec.md §5.11），但 Firebase JS SDK 在 React Native 環境沒有對應的持久化 API，
// 目前是 memory-only cache（App 重啟後快取清空，但線上讀寫不受影響）。若要做到跟 Web 版
// 一樣的離線快取，需評估換成 @react-native-firebase/firestore（原生模組，Expo Go 不支援，
// 需改用 EAS development build），先在 MVP 階段擱置，等離線體驗真的成為問題再處理。
