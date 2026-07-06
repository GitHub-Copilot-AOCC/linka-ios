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

## 目前進度（2026-07-06）

**Phase 0/1/2 已全部完成**（對照 iOS 開發計畫）：

- Phase 0：專案骨架、依賴安裝、`src/domain`/`src/data`/`src/services` 複製、`src/platform` 實作
- Phase 1 MVP：Email/密碼登入、底部 Tab 導覽殼、聯絡人列表
- Phase 2：
  1. 聯絡人 CRUD + 照片上傳
  2. 互動紀錄、手動提醒、首頁摘要面板
  3. 標籤管理、搜尋/排序
  4. 全部 6 項 AI 功能（名片 OCR、建議話題、AI 問答、語音/文字快速記錄、文件匯入、
     網路研究摘要）——**完全沿用既有 `geminiProxy` Cloud Function，沒有改動任何後端程式碼**
  5. 設定頁（語言切換、AI 用量顯示、同步狀態、操作歷史、登出）

**尚未做**（比照 Web repo 的暫緩範圍）：
- Google 登入（需要原生 Google Sign-In SDK，見 `authRepository.ts` 的 TODO）
- Excel 匯出（手機上應該改成分享而非下載，UX 決策待定，故意先跳過不是忘記）
- 跟 Web repo 一樣暫緩三個月的 4 項：AI 額度後端執行、Google 聯絡人 API 匯入、照片搜尋、Stripe

**驗證方式的限制**：每個功能都跑過 `tsc --noEmit`（型別檢查）跟 `npx expo export --platform ios`
（Metro 真的把所有 import 打包過一次，能抓到 tsc 抓不到的 conditional exports 解析問題），
但**完全沒有在真機上用 Expo Go 實際點過任何一個畫面**——開發環境沒有 Mac 也沒有連接實體
裝置，Expo Go 連線本身也還在排查中（見對話紀錄的公司網路 AP isolation 問題）。上真機測試
前，不應該假設任何互動流程（尤其是相機/錄音/檔案選取這幾個原生模組串接）已經驗證過。
