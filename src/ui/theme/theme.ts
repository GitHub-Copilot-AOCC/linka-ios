import { MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// 視覺重新設計規格表色彩（見使用者提供的 mockup）：只給了 6 個色號，其餘 MD3 角色
// （container/on*/outline 等）是從這幾個色號手動推導出的淺色調/深色文字組合，不是
// 完整的 Material tonal palette generator 算出來的——跟 Web 版 theme.ts 的做法一致
// （v1 先手選幾個角色，之後才考慮上完整產生器）。
const PRIMARY = '#6C63FF';
const SECONDARY = '#A788FA';
const TERTIARY = '#34C759'; // 規格表「成功」色
export const WARNING_COLOR = '#FF9F0A'; // 規格表「警告」色，MD3 沒有對應角色，另外匯出給需要的畫面用
const ERROR = '#FF3B30'; // iOS 系統紅（使用者確認：跟規格表其他色一樣走 Apple 系統色，不沿用 Web 版的 #ba1a1a）
const BACKGROUND = '#F2F2F7'; // 規格表背景色，iOS 原生 Grouped List 的畫面底色
const SURFACE = '#FFFFFF'; // 卡片/row 用純白，跟上面的背景色形成層次（使用者確認：走 iOS 原生慣例）
const ON_SURFACE = '#1C1C1E'; // iOS 系統 label 色
const ON_SURFACE_VARIANT = '#8E8E93'; // 規格表「文字次要色」
const OUTLINE = '#E5E5EA'; // iOS 系統 separator 色（使用者確認）

// 字級規格表：34 Bold / 22 Semibold / 17 Regular / 13 Regular，對應到 MD3 角色
// （使用者確認的對照）：大標題/區塊標題/內文/輔助文字。fontFamily 留給 MD3 預設值
// 帶出（iOS 上就是 'System'，會自動吃到 SF Pro，不需要另外載入字型檔）。
const fonts = configureFonts({
  config: {
    headlineLarge: { fontSize: 34, fontWeight: '700', lineHeight: 41 },
    titleLarge: { fontSize: 22, fontWeight: '600', lineHeight: 28 },
    bodyLarge: { fontSize: 17, fontWeight: '400', lineHeight: 24 },
    bodySmall: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  },
});

export const theme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 16,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: PRIMARY,
    onPrimary: '#FFFFFF',
    primaryContainer: '#E6E4FF',
    onPrimaryContainer: '#3730A3',
    secondary: SECONDARY,
    onSecondary: '#FFFFFF',
    secondaryContainer: '#F1EAFE',
    onSecondaryContainer: '#5B21B6',
    tertiary: TERTIARY,
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#D9F7E3',
    onTertiaryContainer: '#166534',
    background: BACKGROUND,
    onBackground: ON_SURFACE,
    surface: SURFACE,
    onSurface: ON_SURFACE,
    surfaceVariant: '#E9E9EF',
    onSurfaceVariant: ON_SURFACE_VARIANT,
    surfaceDisabled: 'rgba(28, 28, 30, 0.12)',
    onSurfaceDisabled: 'rgba(28, 28, 30, 0.38)',
    error: ERROR,
    onError: '#FFFFFF',
    errorContainer: '#FFE5E3',
    onErrorContainer: '#8B1B12',
    outline: OUTLINE,
    outlineVariant: '#F0F0F3',
    inverseSurface: ON_SURFACE,
    inverseOnSurface: '#FFFFFF',
    inversePrimary: '#B4AEFF',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(28, 28, 30, 0.4)',
    elevation: {
      level0: 'transparent',
      level1: '#FAF9FE',
      level2: '#F7F5FD',
      level3: '#F3F1FC',
      level4: '#F2F0FB',
      level5: '#EFEDFA',
    },
  },
};

// 卡片陰影規格：0 4 20 rgba(0,0,0,0.06)。RN 沒有 CSS box-shadow，拆成 shadow* 屬性
// （iOS 吃這組），elevation 給 Android 當 fallback（這個 App 目前只上 iOS，但保留無妨）。
export const CARD_SHADOW = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 20,
  elevation: 3,
} as const;
