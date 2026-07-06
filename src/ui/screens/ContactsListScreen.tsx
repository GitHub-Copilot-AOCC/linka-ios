import { useEffect } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Text, Avatar, List, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import { useContactsStore } from '@ui/store/contactsStore';
import { useAuthStore } from '@ui/store/authStore';

type Props = NativeStackScreenProps<ContactsStackParamList, 'ContactsList'>;

/**
 * 聯絡人列表（見 spec.md §5.2）：Phase 2 加上點擊進詳情頁 + FAB 新增，取代 Phase 1 的唯讀版本。
 * 搜尋/排序/標籤留給後續 Phase 依 Web 版已完成的順序補上。
 */
export function ContactsListScreen({ navigation }: Props) {
  const uid = useAuthStore((s) => s.user?.uid);
  const { contacts, loading, subscribe } = useContactsStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (uid) return subscribe(uid);
  }, [uid, subscribe]);

  return (
    <View style={styles.container}>
      {!loading && contacts.length === 0 ? (
        <View style={styles.empty}>
          <Text>{t('contacts.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={item.company}
              left={() => <Avatar.Text size={40} label={item.name.slice(0, 1)} />}
              onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
            />
          )}
        />
      )}
      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('AddContact')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
