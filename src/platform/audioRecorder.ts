import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';

export interface RecordingResult {
  uri: string;
  mimeType: string;
}

/**
 * RN 實作：expo-audio 的錄音 API 只能透過 hook 使用（`useAudioRecorder`），跟 Web 版
 * `startRecording()` 這種「元件外、指令式」的介面形狀不同（見這個檔案先前版本的 TODO），
 * 所以這裡改成 hook 形式，直接在畫面元件內用：
 *
 *   const recorder = useVoiceRecorder();
 *   await recorder.start();
 *   const { uri, mimeType } = await recorder.stop();
 */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  async function start(): Promise<void> {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) throw new Error('Microphone permission denied');
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function stop(): Promise<RecordingResult> {
    await recorder.stop();
    if (!recorder.uri) throw new Error('Recording produced no output file');
    return { uri: recorder.uri, mimeType: 'audio/m4a' };
  }

  return { isRecording: recorder.isRecording, start, stop };
}
