import { useEffect } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, List, SegmentedButtons, ProgressBar, Button, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@ui/navigation/SettingsStackParamList';
import { useAuthStore } from '@ui/store/authStore';
import { useUsageQuotaStore } from '@ui/store/usageQuotaStore';
import { SyncStatusChip } from '@ui/components/SyncStatusChip';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsMain'>;

/** 設定畫面：帳號資訊、同步狀態、AI 用量、操作歷史入口、語言切換、登出（見 spec.md §11.2、§3、§5.12）。 */
export function SettingsScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { t, i18n } = useTranslation();
  const { quota, subscribe } = useUsageQuotaStore();

  useEffect(() => {
    if (user) return subscribe(user.uid);
  }, [user, subscribe]);

  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        {t('settings.title')}
      </Text>

      <List.Item title={t('settings.account')} description={user.email} />
      <Divider />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('settings.language')}</Text>
        <SegmentedButtons
          value={i18n.language}
          onValueChange={(v) => i18n.changeLanguage(v)}
          buttons={[
            { value: 'zh-TW', label: '中文' },
            { value: 'en', label: 'EN' },
          ]}
        />
      </View>
      <Divider />

      <View style={styles.section}>
        <Text style={styles.rowLabel}>{t('settings.aiUsage')}</Text>
        {quota ? (
          <>
            <Text variant="bodySmall" style={styles.description}>
              {t('settings.aiUsageCount', { used: quota.aiCallsUsed, limit: quota.aiCallsLimit })}
            </Text>
            <ProgressBar progress={Math.min(1, quota.aiCallsUsed / quota.aiCallsLimit)} style={styles.progress} />
          </>
        ) : (
          <Text variant="bodySmall" style={styles.description}>
            {t('settings.aiUsageUnavailable')}
          </Text>
        )}
      </View>
      <Divider />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('settings.syncStatus')}</Text>
        <SyncStatusChip />
      </View>
      <Divider />

      <List.Item
        title={t('settings.operationLog')}
        right={() => (
          <Button onPress={() => navigation.navigate('OperationLog')}>{t('settings.view')}</Button>
        )}
      />

      <Button mode="outlined" textColor="#ba1a1a" onPress={() => logout()} style={styles.logoutButton}>
        {t('settings.logout')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowLabel: {},
  section: { paddingVertical: 12 },
  description: { color: '#666', marginBottom: 4 },
  progress: { height: 6, borderRadius: 3 },
  logoutButton: { marginTop: 24 },
});
