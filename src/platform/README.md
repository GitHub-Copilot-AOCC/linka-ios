# /src/platform

平台介面與實作（RN/Expo 版）。對應 Web 版（GitHub-Copilot-AOCC/Linka）的 `src/platform`，
介面命名盡量保持一致，但實作全部換成 Expo 對應的原生模組：

| 能力 | 檔案 | Web 版用什麼 | 這裡用什麼 |
|---|---|---|---|
| 圖片壓縮 | `imageCompression.ts` | Canvas API | `expo-image-manipulator` |
| 照片/檔案選取 | `filePicker.ts` | `<input type="file">` | `expo-image-picker` + `expo-document-picker`（拆成 `pickImage`/`pickDocument` 兩個函式，RN 沒有對應的單一 API） |
| 連線狀態偵測 | `connectivity.ts` | `window` online/offline 事件 | `@react-native-community/netinfo` |
| 語系偵測 | `locale.ts` | `navigator.language` | `expo-localization` |
| 錄音（§5.3a） | `audioRecorder.ts` | `MediaRecorder` | `expo-audio`，但公開 API 是 hook 形式（`useAudioRecorder`），跟其他平台檔案不同，這裡改成匯出 `useVoiceRecorder()` hook 而非指令式函式，QuickCaptureScreen 內直接呼叫 |

## `src/domain`、`src/data`、`src/services` 是從 Web repo 複製過來的，不是共用套件

見專案根目錄 README 的「跟 Web repo 的關係」一節。目前是**一次性複製**，兩邊會分岔，
之後若這幾層又要大改，考慮抽成獨立 repo 用 git dependency 共用（現在先不做）。
