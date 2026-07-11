import * as ImageManipulator from 'expo-image-manipulator';
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
