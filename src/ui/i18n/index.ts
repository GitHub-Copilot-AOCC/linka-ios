import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';
import { detectDeviceLocale } from '@platform/locale';

// 見 spec.md §5.12：繁體中文 + 英文雙語，預設依裝置語言偵測。RN 版沒有 i18next-browser-languagedetector
// 這種瀏覽器專屬套件，改用 @platform/locale 的 detectDeviceLocale()（expo-localization 實作）；
// 手動切換後的持久化留給 Phase 2 設定頁一起做（對應 Web 版用 localStorage，RN 版要用 AsyncStorage）。
i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': { translation: zhTW },
    en: { translation: en },
  },
  lng: detectDeviceLocale(),
  fallbackLng: 'zh-TW',
  supportedLngs: ['zh-TW', 'en'],
  interpolation: { escapeValue: false },
});

export default i18n;
