import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, List, SegmentedButtons, ProgressBar, Button, Divider, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@ui/navigation/SettingsStackParamList';
import { useAuthStore } from '@ui/store/authStore';
import { useUsageQuotaStore } from '@ui/store/usageQuotaStore';
import { useContactsStore } from '@ui/store/contactsStore';
import { useInteractionsStore } from '@ui/store/interactionsStore';
import { useTagsStore } from '@ui/store/tagsStore';
import { SyncStatusChip } from '@ui/components/SyncStatusChip';
import { exportContactsToExcel } from '@platform/exportContacts';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsMain'>;

/** 設定畫面：帳號資訊、同步狀態、AI 用量、操作歷史入口、語言切換、資料匯出、登出（見 spec.md §11.2、§3、§5.12）。 */
export function SettingsScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { t, i18n } = useTranslation();
  const { quota, subscribe } = useUsageQuotaStore();
  const { contacts, subscribe: subscribeContacts } = useContactsStore();
  const { all: interactions, subscribeAll: subscribeInteractions } = useInteractionsStore();
  const { tags, subscribe: subscribeTags } = useTagsStore();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (user) return subscribe(user.uid);
  }, [user, subscribe]);

  useEffect(() => {
    if (user) return subscribeContacts(user.uid);
  }, [user, subscribeContacts]);

  useEffect(() => {
    if (user) return subscribeInteractions(user.uid);
  }, [user, subscribeInteractions]);

  useEffect(() => {
    if (user) return subscribeTags(user.uid);
  }, [user, subscribeTags]);

  if (!user) return null;

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      await exportContactsToExcel(contacts, interactions, tags, {
        contactColumnLabels: [
          t('contacts.name'),
          t('editContact.role'),
          t('contacts.company'),
          t('editContact.phone'),
          t('auth.email'),
          t('editContact.birthday'),
          t('editContact.linkedin'),
          t('editContact.tags'),
          t('editContact.importance'),
          t('editContact.notes'),
        ],
        interactionColumnLabels: [
          t('export.colContactName'),
          t('interactionsDialog.type'),
          t('interactionsDialog.date'),
          t('interactionsDialog.description'),
        ],
        contactsSheetName: t('export.sheetContacts'),
        interactionsSheetName: t('export.sheetInteractions'),
        interactionTypeLabels: {
          meeting: t('interactionsDialog.typeMeeting'),
          call: t('interactionsDialog.typeCall'),
          email: t('interactionsDialog.typeEmail'),
        },
        deletedContactLabel: t('common.deletedContact'),
      });
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

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
      <Divider />

      <View style={styles.section}>
        <Text style={styles.rowLabel}>{t('settings.exportContacts')}</Text>
        <Text variant="bodySmall" style={styles.description}>
          {t('settings.exportDescription')}
        </Text>
        {exportError && <HelperText type="error">{exportError}</HelperText>}
        <Button
          mode="outlined"
          onPress={handleExport}
          loading={exporting}
          disabled={exporting || contacts.length === 0}
          style={styles.exportButton}
        >
          {t('settings.exportButton')}
        </Button>
      </View>

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
  exportButton: { marginTop: 8, alignSelf: 'flex-start' },
  logoutButton: { marginTop: 24 },
});
