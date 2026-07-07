// 依聯絡人 id 決定固定的頭像顏色（見 Web 版 src/ui/theme/avatarPalette.ts：每個人的頭像圓圈
// 應該是不同顏色，不是統一同一色）。Web 版用 CSS linear-gradient，RN 的 Avatar.Text 只吃單一
// backgroundColor，沒有安裝 expo-linear-gradient 前先用純色版本，取每個漸層的起始色代表同一組色票，
// 保留「同一人每次都拿到同一個顏色」的行為（純字串雜湊，不用存進資料庫）。

const AVATAR_COLORS = ['#6D5DF6', '#FF6B9D', '#34D1BF', '#F6416C', '#A770EF', '#F7B733', '#43CBFF', '#11998E'];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** 依 seed（通常是 contact.id）決定固定的頭像背景色。 */
export function avatarColorFor(seed: string): string {
  return AVATAR_COLORS[hashString(seed) % AVATAR_COLORS.length];
}
