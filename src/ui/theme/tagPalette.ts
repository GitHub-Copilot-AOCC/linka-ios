// 依標籤 id 自動分配固定的顏色+icon 組合（見 Web 版 src/ui/theme/tagPalette.ts）。
// icon 名稱對照 MaterialCommunityIcons（react-native-paper Chip 的 icon prop 吃這套），
// 跟 Web 版用的 MUI icon 語意上盡量對應，不用完全同名。

export interface TagStyle {
  bg: string;
  fg: string;
  icon: string;
}

const TAG_STYLES: TagStyle[] = [
  { bg: '#FFE1EC', fg: '#D6336C', icon: 'heart' },
  { bg: '#E3F2FD', fg: '#1565C0', icon: 'account-group' },
  { bg: '#E8F5E9', fg: '#2E7D32', icon: 'school' },
  { bg: '#FFF3E0', fg: '#EF6C00', icon: 'briefcase' },
  { bg: '#FFFDE7', fg: '#F9A825', icon: 'star' },
  { bg: '#E0F2F1', fg: '#00695C', icon: 'office-building' },
  { bg: '#F3E5F5', fg: '#6A1B9A', icon: 'account-multiple-outline' },
  { bg: '#ECEFF1', fg: '#455A64', icon: 'tag' },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** 依 seed（通常是 tag.id）決定固定的顏色+icon 組合。 */
export function tagStyleFor(seed: string): TagStyle {
  return TAG_STYLES[hashString(seed) % TAG_STYLES.length];
}
