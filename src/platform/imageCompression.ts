import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import type { CardBoundingBox } from '@domain/businessCard';

/**
 * RN 實作：用 expo-image-manipulator 縮小圖片（見 spec.md §5.2、§8.2）。
 * 對應 Web 版的 Canvas 壓縮，介面回傳型別改成 RN 慣用的 uri 字串（而非 Blob），
 * 呼叫端（contactsRepository.uploadContactPhoto）之後上傳時再用 fetch(uri) 轉成 Blob。
 */
export async function compressImage(uri: string, maxDimension = 1024, quality = 0.8): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: maxDimension } }], {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

const PENDING_PHOTOS_DIR = `${FileSystem.documentDirectory}pending-photos/`;

/**
 * 把 expo-image-manipulator 產生的暫存檔複製到 documentDirectory（見使用者回報：名片掃描
 * 完成、聯絡人存檔後，照片集完全沒有出現任何照片，連未裁切的原圖都沒有）。懷疑根因：
 * compressImage/cropToBoundingBox 的輸出預設落在 cacheDirectory，名片掃描到使用者實際按下
 * 「儲存」中間會經過填表確認（可能數十秒到數分鐘），這段時間 cache 檔案有被系統回收的風險，
 * 導致存檔那一刻 fetch(uri) 讀不到檔案而整批上傳靜默失敗。documentDirectory 不會被系統自動
 * 清理，確保從掃描完到使用者按下儲存這段等待期間檔案都還在。
 */
export async function persistPickedImage(uri: string): Promise<string> {
  const dirInfo = await FileSystem.getInfoAsync(PENDING_PHOTOS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PENDING_PHOTOS_DIR, { intermediates: true });
  }
  const dest = `${PENDING_PHOTOS_DIR}${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

/** 上傳成功後清掉 persistPickedImage 產生的暫存檔，避免 documentDirectory 累積孤兒檔案；刪不掉不算致命錯誤。 */
export async function cleanupPendingImage(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // best-effort，刪不掉頂多留下一個沒用到的暫存檔
  }
}

/**
 * 名片辨識用：把照片裁切成只留 Gemini 偵測出的名片邊界框（見 spec.md §5.5 項目1 擴充：
 * 掃描後自動存入照片集前先裁掉背景）。box 是正規化座標（0–1，相對整張照片寬高），
 * 先用空 actions 呼叫一次讀出目前圖片的實際像素寬高，再換算成像素座標裁切。
 */
export async function cropToBoundingBox(uri: string, box: CardBoundingBox): Promise<string> {
  const { width: imageWidth, height: imageHeight } = await ImageManipulator.manipulateAsync(uri, [], {});
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: Math.round(box.x * imageWidth),
          originY: Math.round(box.y * imageHeight),
          width: Math.round(box.width * imageWidth),
          height: Math.round(box.height * imageHeight),
        },
      },
    ],
    { format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
