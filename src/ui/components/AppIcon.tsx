import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { MDI_TO_SF_SYMBOL } from '@ui/theme/sfSymbols';

interface AppIconProps {
  name: unknown;
  color?: string;
  size?: number;
  direction?: 'ltr' | 'rtl';
  testID?: string;
}

/**
 * react-native-paper 的全域圖示 renderer（見 PaperProvider 的 `settings.icon`）。查
 * `MDI_TO_SF_SYMBOL` 對照表：找得到就畫 SF Symbol，找不到就照舊退回 MaterialCommunityIcons
 * ——涵蓋 react-native-paper 元件內建預設圖示（checkbox/eye/menu-down 等）跟品牌 logo
 * （google 等），這些沒有對應的 SF Symbol，刻意不收進對照表，讓它們自動走 fallback。
 */
export function AppIcon({ name, color, size = 24, direction, testID }: AppIconProps) {
  const sfName = typeof name === 'string' ? MDI_TO_SF_SYMBOL[name] : undefined;

  if (sfName) {
    return <SymbolView name={sfName} size={size} tintColor={color} style={{ width: size, height: size }} />;
  }

  return (
    <MaterialCommunityIcons
      name={name as never}
      color={color}
      size={size}
      direction={direction}
      testID={testID}
    />
  );
}

interface SFIconProps {
  name: SFSymbol;
  size?: number;
  color?: string;
}

/**
 * 直接畫指定的 SF Symbol，不經過 MDI 對照表——給新增的畫面元素用（例如 Dashboard 統計卡、
 * AI 建議卡的 sparkles 圖示），這些沒有對應的舊 MDI 名稱字串，不需要 fallback 邏輯。
 * 跟 AppIcon 是分開的用途：AppIcon 是既有 `icon="mdi-name"` 呼叫端的全域 renderer。
 */
export function SFIcon({ name, size = 24, color }: SFIconProps) {
  return <SymbolView name={name} size={size} tintColor={color} style={{ width: size, height: size }} />;
}
