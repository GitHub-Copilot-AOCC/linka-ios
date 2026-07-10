import { Children, Fragment } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CARD_SHADOW } from '@ui/theme/theme';

interface GroupedSectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * iOS 原生 Settings App 風格的分組列表：一張圓角卡片包住多個 GroupedRow，row 之間用細
 * 淺分隔線（不是每個欄位各自一個外框）。取代原本 ContactFormFields/SettingsScreen 各自
 * 手動加外框 TextInput 或 Divider 的寫法（視覺重新設計，見使用者提供的 mockup）。
 *
 * 分隔線由這裡統一插入（在每個 child 之間，最後一個 row 後面不加），呼叫端只要把
 * GroupedRow 一個個排進 children 就好，不用自己處理分隔線。
 */
export function GroupedSection({ title, footer, children, style }: GroupedSectionProps) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={style}>
      {title && (
        <Text variant="bodySmall" style={[styles.title, { color: theme.colors.onSurfaceVariant }]}>
          {title}
        </Text>
      )}
      {/* 陰影跟圓角裁切不能套在同一層（iOS 上 overflow:hidden 會把 shadow 一起裁掉），
          外層只負責陰影，內層才裁圓角。 */}
      <View style={[{ borderRadius: theme.roundness }, CARD_SHADOW]}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.roundness }]}>
          {rows.map((row, index) => (
            <Fragment key={index}>
              {row}
              {index < rows.length - 1 && (
                <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
              )}
            </Fragment>
          ))}
        </View>
      </View>
      {footer && (
        <Text variant="bodySmall" style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>
          {footer}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginLeft: 16, marginBottom: 6, textTransform: 'uppercase' },
  card: { overflow: 'hidden' },
  divider: { height: 1, marginLeft: 16 },
  footer: { marginLeft: 16, marginTop: 6 },
});
