import * as ImageManipulator from 'expo-image-manipulator';

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
