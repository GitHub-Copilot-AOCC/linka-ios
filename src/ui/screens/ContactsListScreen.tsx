import { useEffect } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Text, Avatar, List } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useContactsStore } from '@ui/store/contactsStore';

interface ContactsListScreenProps {
  uid: string;
}

/**
 * 聯絡人列表（見 spec.md §5.2）：Phase 1 MVP 先做唯讀，驗證 Firestore 訂閱 + RN 渲染整條路徑。
 * CRUD/照片/標籤/搜尋排序等留給 Phase 2 依 Web 版已完成的順序補上。
 */
export function ContactsListScreen({ uid }: ContactsListScreenProps) {
  const { contacts, loading, subscribe } = useContactsStore();
  const { t } = useTranslation();

  useEffect(() => subscribe(uid), [uid, subscribe]);

  if (!loading && contacts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text>{t('contacts.empty')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={contacts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <List.Item
          title={item.name}
          description={item.company}
          left={() => <Avatar.Text size={40} label={item.name.slice(0, 1)} />}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
