// TODO(iOS, Phase 2 語音快速記錄 §5.3a)：Web 版用 MediaRecorder 提供 startRecording()/stop()
// 這種「元件外、指令式」的介面（見 Web repo 的 src/platform/audioRecorder.ts）。expo-audio 的公開
// API 主要是 hook 形式（`useAudioRecorder`），必須在 React 元件內使用，跟這個指令式介面形狀不同。
// 這個檔案先留空介面 + 佔位實作，等真的要做語音快速記錄畫面時，直接在該畫面元件內用
// `useAudioRecorder(RecordingPresets.HIGH_QUALITY)` 拿到 recorder 物件（`.record()`/`.stop()`/`.uri`），
// 不需要勉強套用這個指令式包裝——到時候依實際 API 重新設計這個檔案的介面形狀，而不是照搬 Web 版签名。
export interface RecordingResult {
  uri: string;
  mimeType: string;
}

export interface AudioRecorderHandle {
  stop(): Promise<RecordingResult>;
}

export async function startRecording(): Promise<AudioRecorderHandle> {
  throw new Error('audioRecorder 尚未實作，等 Phase 2 語音快速記錄畫面開發時再依 expo-audio 實際 API 補上');
}
