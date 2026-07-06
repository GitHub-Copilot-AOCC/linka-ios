@AGENTS.md

# Linka iOS — 開發守則

見 [README.md](README.md) 了解跟 Web repo（GitHub-Copilot-AOCC/Linka）的關係與目前進度。

## 分層架構（沿用 Web repo 的規則）

- `src/domain`、`src/data`、`src/services` 禁止 import 任何 RN/Expo 專屬 API，維持
  跨平台可攜（這三層目前是從 Web repo 複製過來的，見 README「跟 Web repo 的關係」）。
- `src/platform` 是唯一允許直接呼叫原生模組（`expo-image-picker`、`expo-audio` 等）的地方，
  對外只透過介面命名跟 Web 版一致的函式暴露。
- `src/ui`（畫面/元件）不直接呼叫 Firestore SDK，一律透過 `src/data` 的 repository 函式；
  不內嵌驗證/業務邏輯，一律呼叫 `src/domain` 的函式。

## 環境限制

開發機沒有 Mac，**不能**用 bare React Native 本機建置流程。全程走 Expo managed workflow：
`npx expo start` + Expo Go App 掃碼預覽，正式建置用 `eas build`（雲端，不需要本機 Mac）。

## 已知的技術債/TODO（見對應檔案內註解）

- `src/data/firebase.ts`：Firestore 離線持久化目前是 memory-only，沒有做到跟 Web 版
  一樣的離線快取。
- `src/data/authRepository.ts`：Google 登入尚未實作。
- `src/platform/audioRecorder.ts`：語音錄製尚未實作（等 Phase 2 語音快速記錄畫面時補上）。
- `src/data/firebase.ts` 的 `getReactNativePersistence` import 有一個 `@ts-expect-error`，
  是 tsc 標準模式解析 conditional exports 跟 Metro 實際解析結果不一致造成的已知落差，
  已用 `npx expo export --platform ios` 驗證過 Metro 能正確打包（不是我們的程式碼問題）。

