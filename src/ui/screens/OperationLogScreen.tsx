import { useEffect } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Text, List } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLogsStore } from '@ui/store/logsStore';
import { useAuthStore } from '@ui/store/authStore';

/** 操作歷史紀錄（見 spec.md §5.10），唯讀清單，最新在前。 */
export function OperationLogScreen() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { logs, subscribe } = useLogsStore();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (uid) return subscribe(uid);
  }, [uid, subscribe]);

  if (logs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text>{t('operationLog.empty')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={logs}
      keyExtractor={(log) => log.id}
      renderItem={({ item }) => (
        <List.Item
          title={`${item.action} — ${item.contactName}`}
          description={`${item.details} · ${new Date(item.createdAt).toLocaleString(i18n.language)}`}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
