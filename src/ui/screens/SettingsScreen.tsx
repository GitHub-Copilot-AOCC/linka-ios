import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, SegmentedButtons, ProgressBar, Button, HelperText, useTheme } from 'react-native-paper';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@ui/navigation/SettingsStackParamList';
import { useAuthStore } from '@ui/store/authStore';
import { useUsageQuotaStore } from '@ui/store/usageQuotaStore';
import { useContactsStore } from '@ui/store/contactsStore';
import { useInteractionsStore } from '@ui/store/interactionsStore';
import { useTagsStore } from '@ui/store/tagsStore';
import { SyncStatusChip } from '@ui/components/SyncStatusChip';
import { GroupedSection } from '@ui/components/GroupedSection';
import { GroupedRow } from '@ui/components/GroupedRow';
import { ContactAvatar } from '@ui/components/ContactAvatar';
import { exportContactsToExcel } from '@platform/exportContacts';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsMain'>;

/**
 * 設定畫面：帳號資訊、同步狀態、AI 用量、操作歷史入口、語言切換、資料匯出、登出
 * （見 spec.md §11.2、§3、§5.12）。視覺重新設計：改用 GroupedSection/GroupedRow，
 * 加一列唯讀個人資料（見假設 2：只綁定既有 authStore 資料，不導向任何新畫面）。
 */
export function SettingsScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  // 見 AssistantChatScreen.tsx 同樣的註解：浮動毛玻璃 Tab Bar 不會自動保留版面空間，
  // 登出按鈕在畫面最下方，不補 padding 會被蓋住點不到。
  const tabBarHeight = useBottomTabBarHeight();
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
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + 24 }]}>
      <View style={styles.profileRow}>
        <ContactAvatar
          photoUrl={user.photoURL ?? undefined}
          name={user.displayName ?? user.email ?? '?'}
          seed={user.uid}
          size={56}
        />
        <View style={styles.profileInfo}>
          <Text variant="titleLarge" numberOfLines={1}>
            {user.displayName ?? t('settings.account')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </View>

      <GroupedSection style={styles.section}>
        <GroupedRow icon="globe" iconBackgroundColor="#6C63FF" label={t('settings.language')}>
          <SegmentedButtons
            value={i18n.language}
            onValueChange={(v) => i18n.changeLanguage(v)}
            buttons={[
              { value: 'zh-TW', label: '中文' },
              { value: 'en', label: 'EN' },
            ]}
          />
        </GroupedRow>
      </GroupedSection>

      <GroupedSection style={styles.section}>
        <GroupedRow icon="sparkles" iconBackgroundColor="#A788FA">
          <View style={styles.usageRow}>
            <Text>{t('settings.aiUsage')}</Text>
            {quota ? (
              <>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('settings.aiUsageCount', { used: quota.aiCallsUsed, limit: quota.aiCallsLimit })}
                </Text>
                <ProgressBar progress={Math.min(1, quota.aiCallsUsed / quota.aiCallsLimit)} style={styles.progress} />
              </>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('settings.aiUsageUnavailable')}
              </Text>
            )}
          </View>
        </GroupedRow>
        <GroupedRow icon="icloud.fill" iconBackgroundColor="#34C759" label={t('settings.syncStatus')} value={<SyncStatusChip />} />
        <GroupedRow
          icon="clock.arrow.circlepath"
          iconBackgroundColor="#8E8E93"
          label={t('settings.operationLog')}
          onPress={() => navigation.navigate('OperationLog')}
          value={<Text style={{ color: theme.colors.primary }}>{t('settings.view')}</Text>}
        />
      </GroupedSection>

      <GroupedSection footer={t('settings.exportDescription')} style={styles.section}>
        <GroupedRow icon="square.and.arrow.up" iconBackgroundColor="#FF9F0A">
          <View style={styles.exportRow}>
            <Text>{t('settings.exportContacts')}</Text>
            <Button
              mode="text"
              compact
              onPress={handleExport}
              loading={exporting}
              disabled={exporting || contacts.length === 0}
            >
              {t('settings.exportButton')}
            </Button>
          </View>
        </GroupedRow>
      </GroupedSection>
      {exportError && <HelperText type="error">{exportError}</HelperText>}

      <GroupedSection style={styles.section}>
        <GroupedRow icon="rectangle.portrait.and.arrow.right" label={t('settings.logout')} destructive onPress={() => logout()} />
      </GroupedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, paddingHorizontal: 4 },
  profileInfo: { flex: 1, minWidth: 0 },
  section: { marginBottom: 16 },
  usageRow: { flex: 1, gap: 4 },
  progress: { height: 6, borderRadius: 3, marginTop: 2 },
  exportRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
