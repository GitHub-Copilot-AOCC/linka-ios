import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

/** Phase 1 佔位首頁；生日/提醒/近況摘要面板留給 Phase 2 依 Web 版順序補上。 */
export function DashboardScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">{t('dashboard.title')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
});
