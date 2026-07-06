import { useEffect, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Text, Avatar, List, FAB, Searchbar, SegmentedButtons, Chip, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import { filterContactsByKeyword, filterContactsByTag, sortContacts, type ContactSortBy } from '@domain/contact';
import { useContactsStore } from '@ui/store/contactsStore';
import { useTagsStore } from '@ui/store/tagsStore';
import { useAuthStore } from '@ui/store/authStore';

type Props = NativeStackScreenProps<ContactsStackParamList, 'ContactsList'>;

/** 聯絡人列表（見 spec.md §5.2）：搜尋/排序/標籤篩選 + 點擊進詳情頁 + FAB 新增。 */
export function ContactsListScreen({ navigation }: Props) {
  const uid = useAuthStore((s) => s.user?.uid);
  const { contacts, loading, subscribe } = useContactsStore();
  const tags = useTagsStore((s) => s.tags);
  const subscribeTags = useTagsStore((s) => s.subscribe);
  const { t } = useTranslation();

  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<ContactSortBy>('name');
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubContacts = subscribe(uid);
    const unsubTags = subscribeTags(uid);
    return () => {
      unsubContacts();
      unsubTags();
    };
  }, [uid, subscribe, subscribeTags]);

  const filtered = sortContacts(
    filterContactsByTag(filterContactsByKeyword(contacts, keyword), activeTagId),
    sortBy
  );

  return (
    <View style={styles.container}>
      {contacts.length > 0 && (
        <>
          <View style={styles.toolbarRow}>
            <Searchbar
              placeholder={t('contacts.searchPlaceholder')}
              value={keyword}
              onChangeText={setKeyword}
              style={styles.searchbar}
            />
            <IconButton icon="camera-outline" onPress={() => navigation.navigate('BusinessCardScan')} />
            <IconButton icon="tag-outline" onPress={() => navigation.navigate('TagsManager')} />
          </View>
          <SegmentedButtons
            value={sortBy}
            onValueChange={(v) => setSortBy(v as ContactSortBy)}
            style={styles.sortRow}
            buttons={[
              { value: 'name', label: t('contacts.sortByName') },
              { value: 'importance', label: t('contacts.sortByImportance') },
            ]}
          />
          {tags.length > 0 && (
            <FlatList
              horizontal
              data={tags}
              keyExtractor={(tag) => tag.id}
              style={styles.tagFilterRow}
              renderItem={({ item }) => (
                <Chip
                  selected={activeTagId === item.id}
                  onPress={() => setActiveTagId(activeTagId === item.id ? null : item.id)}
                  style={styles.tagChip}
                >
                  {item.name}
                </Chip>
              )}
            />
          )}
        </>
      )}

      {!loading && filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text>{keyword ? t('contacts.noResults', { keyword }) : t('contacts.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
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
      <FAB icon="creation" style={styles.fabQuickCapture} onPress={() => navigation.navigate('QuickCapture')} />
      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('AddContact')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8 },
  searchbar: { flex: 1 },
  sortRow: { marginHorizontal: 8, marginTop: 8 },
  tagFilterRow: { marginHorizontal: 8, marginTop: 8 },
  tagChip: { marginRight: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  fabQuickCapture: { position: 'absolute', right: 16, bottom: 80 },
});
