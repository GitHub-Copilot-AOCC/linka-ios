# Linka (iOS)

Linka 的 iOS 版（React Native + Expo，managed workflow）。Web 版本體在
[GitHub-Copilot-AOCC/Linka](https://github.com/GitHub-Copilot-AOCC/Linka)，兩者共用
同一個 Firebase 專案（`aifriendcircle-63093`）與同一份使用者/聯絡人資料。

## 跟 Web repo 的關係

`src/domain`、`src/data`、`src/services` 是從 Web repo **一次性複製**過來的，不是共用套件
（決策記錄見 Web repo 的 `TASKS.md` 或詢問維護者）。這代表：

- 這三層的邏輯**目前是兩份獨立程式碼**，Web repo 改了這裡不會自動同步，反過來也一樣。
- 之後如果這三層又要大改（例如新增功能、修 bug），兩邊都要各自改一次，或考慮抽成獨立
  repo 用 `npm install github:ORG/linka-core#main` 這種 git dependency 共用（目前還沒做）。
- 複製過來時做了以下調整（不是逐字複製）：
  - `src/data/firebase.ts`：Auth persistence 換成 `@react-native-async-storage/async-storage`
    （Web 版用 IndexedDB）；Firestore 離線持久化目前是 memory-only（見檔案內 TODO）。
  - `src/data/authRepository.ts`：`signInWithGoogle` 先 throw（Web 版用 `signInWithPopup`，
    RN 沒有對應，需要原生 Google Sign-In SDK，見檔案內 TODO）。
  - `src/services/geminiService.ts`：環境變數從 `import.meta.env.VITE_*` 換成
    `process.env.EXPO_PUBLIC_*`。

`src/platform` 只保留跟 Web 版一致的介面命名，內部實作全部換成 Expo 對應套件，見
[src/platform/README.md](src/platform/README.md) 的對照表。

`src/ui` 完全重寫（React Native + react-native-paper + react-navigation，不是照搬 MUI
元件），只有邏輯（zustand store）盡量保持跟 Web 版一致的介面。

## 開發環境

沒有 Mac，全部在 Windows 上開發：

```bash
npm install
npx expo start
```

用手機上的 **Expo Go** App 掃碼即時預覽，不需要本機 Xcode/模擬器。正式建置（TestFlight/
App Store）交給 Expo 的雲端服務代勞：

```bash
npx eas build --platform ios   # 需要先 npx eas login + npx eas build:configure
npx eas submit --platform ios  # 需要 Apple Developer Program 帳號（$99/年）
```

這兩步只在真的要發正式測試/上架時才需要，不影響日常開發。

## 環境變數

複製 `.env.example` 成 `.env`，填入 Firebase 專案設定（跟 Web repo 用同一個專案，
數值可以直接對照 Web repo 的 `.env`，前綴從 `VITE_` 換成 `EXPO_PUBLIC_`）。

## 目前進度

見專案根目錄或跟維護者確認最新狀態。Phase 1 MVP（Email/密碼登入 + 底部 Tab 導覽殼 +
聯絡人列表唯讀）已完成，尚未上真機用 Expo Go 實測（只驗證過 `tsc --noEmit` 型別檢查
跟 `expo export` 能成功打包 1090 個模組，沒有 import 解析錯誤）。
