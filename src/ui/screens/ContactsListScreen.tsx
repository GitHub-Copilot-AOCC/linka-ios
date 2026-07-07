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
import { avatarColorFor } from '@ui/theme/avatarPalette';
import { tagStyleFor } from '@ui/theme/tagPalette';

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
            <IconButton icon="file-upload-outline" onPress={() => navigation.navigate('DocumentImport')} />
            <IconButton icon="card-account-phone-outline" onPress={() => navigation.navigate('ImportContacts')} />
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
            // 見 spec.md §5.2：Web 版標籤列會自動換行、一次顯示全部（見 Web repo
            // ContactsListScreen.tsx 的 flexWrap: 'wrap'），不是橫向滑動單行——之前用橫向
            // FlatList 會把大部分標籤捲到畫面外看不到，改成跟 TagMultiSelect 一樣的換行版面。
            <View style={styles.tagFilterRow}>
              <Chip
                icon="view-grid-outline"
                selected={activeTagId === null}
                onPress={() => setActiveTagId(null)}
                style={styles.tagChip}
                textStyle={styles.tagChipText}
              >
                {t('contacts.allTags')}
              </Chip>
              {tags.map((tag) => {
                const style = tagStyleFor(tag.id);
                const active = activeTagId === tag.id;
                return (
                  <Chip
                    key={tag.id}
                    icon={style.icon}
                    selected={active}
                    onPress={() => setActiveTagId(active ? null : tag.id)}
                    style={[styles.tagChip, { backgroundColor: style.bg }]}
                    textStyle={[styles.tagChipText, { color: style.fg }]}
                  >
                    {tag.name}
                  </Chip>
                );
              })}
            </View>
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
              left={() => (
                <Avatar.Text size={40} label={item.name.slice(0, 1)} style={{ backgroundColor: avatarColorFor(item.id) }} />
              )}
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
  tagFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: 8, marginTop: 8 },
  tagChip: { marginRight: 4, marginBottom: 4 },
  // Chip 內建的行高是照西文字體比例調的，中文字元的字高比較滿，行高不夠會讓下半部被裁掉
  // （見使用者截圖回報：「客戶」兩個字下緣被切掉），明確加大行高留出足夠空間。
  tagChipText: { lineHeight: 22 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  fabQuickCapture: { position: 'absolute', right: 16, bottom: 80 },
});
