import * as Localization from 'expo-localization';
import type { Locale } from '@domain/user';

/** RN 實作：依裝置語言設定偵測預設語系（見 spec.md §5.12）。對應 Web 版的 navigator.language。 */
export function detectDeviceLocale(): Locale {
  const tag = Localization.getLocales()[0]?.languageCode ?? 'zh';
  return tag.startsWith('en') ? 'en' : 'zh-TW';
}
