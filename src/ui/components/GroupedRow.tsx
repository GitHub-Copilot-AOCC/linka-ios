import { View, Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { SFSymbol } from 'sf-symbols-typescript';
import { SFIcon } from '@ui/components/AppIcon';

interface GroupedRowProps {
  icon?: SFSymbol;
  iconColor?: string;
  iconBackgroundColor?: string;
  label?: string;
  value?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * iOS 原生 Grouped List 風格的單一列（見 GroupedSection 說明）。icon 一定會渲染在固定
 * 寬度的 leading slot（維持跨列對齊），後面接的內容：有 `children` 就直接渲染 children
 * （給 TextInput、標籤多選等需要完整自訂內容的列用），否則走預設的 label + value 兩段式
 * 版面（給一般設定/欄位顯示用）。
 */
export function GroupedRow({
  icon,
  iconColor,
  iconBackgroundColor,
  label,
  value,
  onPress,
  destructive,
  children,
  style,
}: GroupedRowProps) {
  const theme = useTheme();
  const trailing = children ?? (
    <>
      <Text style={[styles.label, destructive && { color: theme.colors.error }]} numberOfLines={1}>
        {label}
      </Text>
      {value !== undefined && <View style={styles.valueSlot}>{value}</View>}
    </>
  );

  const content = (
    <>
      {icon && (
        <View
          style={[
            styles.iconSlot,
            iconBackgroundColor ? { backgroundColor: iconBackgroundColor, borderRadius: 7 } : null,
          ]}
        >
          <SFIcon
            name={icon}
            size={18}
            color={iconColor ?? (iconBackgroundColor ? theme.colors.onPrimary : theme.colors.onSurfaceVariant)}
          />
        </View>
      )}
      {trailing}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.colors.surfaceVariant }, style]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.row, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  iconSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 17,
  },
  valueSlot: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
});
