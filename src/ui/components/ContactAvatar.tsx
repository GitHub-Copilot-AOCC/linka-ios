import { Avatar } from 'react-native-paper';
import { avatarColorFor } from '@ui/theme/avatarPalette';

interface ContactAvatarProps {
  photoUrl?: string;
  name: string;
  seed: string;
  size?: number;
}

/**
 * 有上傳過照片就顯示縮圖，沒有才退回姓名縮寫+色塊（見使用者回報：選了照片卻沒有顯示
 * 縮圖——原本每處頭像渲染都只判斷姓名縮寫，從來沒檢查過 `photos` 陣列，只有詳情頁自己
 * 的照片管理區塊才會用 `Avatar.Image`）。集中在這一處，列表/首頁/AI 建議卡/設定頁的
 * 頭像都改用這個，不再各自重複同一個 if/else。
 */
export function ContactAvatar({ photoUrl, name, seed, size = 40 }: ContactAvatarProps) {
  if (photoUrl) {
    return <Avatar.Image size={size} source={{ uri: photoUrl }} />;
  }
  return <Avatar.Text size={size} label={(name || '?').charAt(0)} style={{ backgroundColor: avatarColorFor(seed) }} />;
}
