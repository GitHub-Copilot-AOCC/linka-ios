import type { SFSymbol } from 'sf-symbols-typescript';

/**
 * MaterialCommunityIcons 名稱字串 → SF Symbols 名稱對照表（視覺重新設計，見使用者提供
 * 的 mockup 規格表：圖示走「SF Symbols」）。這個 App 只上 iOS，不需要跨平台圖示庫。
 *
 * 用法：既有畫面繼續用原本的 `icon="camera-outline"` 這種 MDI 名稱字串寫法，不用改任何
 * 呼叫端——實際渲染交給 `AppIcon`（見 src/ui/components/AppIcon.tsx），它會查這個表，
 * 找得到就畫 SF Symbol，找不到（例如 react-native-paper 內建元件自己用的 'check'、
 * 'eye'、'close-circle' 等圖示，或第三方品牌 logo 如 'google'）就照舊退回
 * MaterialCommunityIcons，不會因為漏收一個圖示名稱就整個炸掉或顯示空白。
 */
export const MDI_TO_SF_SYMBOL: Record<string, SFSymbol> = {
  // 底部 Tab（未選取 / 選取兩態，對照原本 MDI 的 `xxx` / `xxx-outline` 兩態）
  home: 'house.fill',
  'home-outline': 'house',
  'account-group': 'person.2.fill',
  'account-group-outline': 'person.2',
  chat: 'bubble.left.and.bubble.right.fill',
  'chat-outline': 'bubble.left.and.bubble.right',
  cog: 'gearshape.fill',
  'cog-outline': 'gearshape',

  // 通用動作
  delete: 'trash',
  send: 'arrow.up.circle.fill',
  close: 'xmark',
  plus: 'plus',
  creation: 'sparkles',

  // 聯絡人列表工具列
  'camera-outline': 'camera',
  camera: 'camera',
  image: 'photo',
  'file-upload-outline': 'square.and.arrow.down',
  'file-upload': 'square.and.arrow.down',
  'card-account-phone-outline': 'person.crop.circle.badge.plus',
  'tag-outline': 'tag',
  tag: 'tag',
  'view-grid-outline': 'square.grid.2x2',
  star: 'star.fill',

  // tagPalette.ts 的分類圖示
  heart: 'heart.fill',
  school: 'graduationcap.fill',
  briefcase: 'briefcase.fill',
  'office-building': 'building.2.fill',
  'account-multiple-outline': 'person.3',
};
