import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

/**
 * RN 實作：用 expo-image-picker/expo-document-picker 選取照片/檔案（見 spec.md §4、§8.2）。
 * Web 版的 `pickFile({ accept, capture })` 是靠瀏覽器 `<input type="file">` 一個 API
 * 同時處理相機/相簿/文件三種情境；RN 沒有對應的單一 API，改成兩個對應各自原生模組的函式，
 * 呼叫端（原本 4 個 Web Dialog 對應的 RN 畫面）依情境呼叫其中一個。
 */

export interface PickedFile {
  uri: string;
  mimeType?: string;
  fileName?: string;
  size?: number;
}

/** 選取或拍攝一張照片；使用者取消則回傳 null。`source: 'camera'` 對應 Web 版的 capture='environment'。 */
export async function pickImage(options: { source?: 'camera' | 'library' } = {}): Promise<PickedFile | null> {
  const permission =
    options.source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result =
    options.source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });

  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName ?? undefined, size: asset.fileSize };
}

/** 選取文件（PDF/docx/xlsx/csv/vcf）；使用者取消則回傳 null。 */
export async function pickDocument(options: { mimeTypes?: string[] } = {}): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: options.mimeTypes ?? '*/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.name, size: asset.size ?? undefined };
}
