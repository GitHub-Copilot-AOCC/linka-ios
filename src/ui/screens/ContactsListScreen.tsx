import { useEffect, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Text, Avatar, List, FAB, IconButton, Searchbar, SegmentedButtons, Chip, Menu, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import { filterContactsByKeyword, filterContactsByTag, sortContacts, type ContactSortBy } from '@domain/contact';
import { useContactsStore } from '@ui/store/contactsStore';
import { useTagsStore } from '@ui/store/tagsStore';
import { useAuthStore } from '@ui/store/authStore';
import { avatarColorFor } from '@ui/theme/avatarPalette';
import { SFIcon } from '@ui/components/AppIcon';

type Props = NativeStackScreenProps<ContactsStackParamList, 'ContactsList'>;

// 單行顯示的標籤上限（含「全部」），超過的收進「更多」選單（視覺重新設計，見使用者提供
// 的 mockup：單行 pill + 更多 chevron，不是像之前那樣直接換行顯示全部）。
const VISIBLE_TAG_LIMIT = 5;

/** 聯絡人列表（見 spec.md §5.2）：搜尋/排序/標籤篩選 + 點擊進詳情頁 + FAB 新增。 */
export function ContactsListScreen({ navigation }: Props) {
  const uid = useAuthStore((s) => s.user?.uid);
  const { contacts, loading, subscribe } = useContactsStore();
  const tags = useTagsStore((s) => s.tags);
  const subscribeTags = useTagsStore((s) => s.subscribe);
  const { t } = useTranslation();
  const theme = useTheme();

  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<ContactSortBy>('name');
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);

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

  const visibleTags = tags.slice(0, VISIBLE_TAG_LIMIT - 1);
  const overflowTags = tags.slice(VISIBLE_TAG_LIMIT - 1);

  function tagChipStyle(active: boolean) {
    return {
      style: [styles.tagChip, { backgroundColor: active ? theme.colors.primaryContainer : theme.colors.surfaceVariant }],
      textStyle: [styles.tagChipText, { color: active ? theme.colors.primary : theme.colors.onSurfaceVariant }],
    };
  }

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
              icon={() => <SFIcon name="magnifyingglass" size={18} color={theme.colors.onSurfaceVariant} />}
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
            <View style={styles.tagFilterRow}>
              <Chip selected={activeTagId === null} onPress={() => setActiveTagId(null)} {...tagChipStyle(activeTagId === null)}>
                {t('contacts.allTags')}
              </Chip>
              {visibleTags.map((tag) => {
                const active = activeTagId === tag.id;
                return (
                  <Chip key={tag.id} selected={active} onPress={() => setActiveTagId(active ? null : tag.id)} {...tagChipStyle(active)}>
                    {tag.name}
                  </Chip>
                );
              })}
              {overflowTags.length > 0 && (
                <Menu
                  visible={moreMenuVisible}
                  onDismiss={() => setMoreMenuVisible(false)}
                  anchor={
                    <Chip
                      onPress={() => setMoreMenuVisible(true)}
                      icon={() => <SFIcon name="chevron.down" size={14} color={theme.colors.onSurfaceVariant} />}
                      {...tagChipStyle(overflowTags.some((tag) => tag.id === activeTagId))}
                    >
                      {t('contacts.moreTags')}
                    </Chip>
                  }
                >
                  {overflowTags.map((tag) => (
                    <Menu.Item
                      key={tag.id}
                      title={tag.name}
                      onPress={() => {
                        setActiveTagId(activeTagId === tag.id ? null : tag.id);
                        setMoreMenuVisible(false);
                      }}
                    />
                  ))}
                </Menu>
              )}
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
              right={() => (
                <SFIcon
                  name={item.importance === 5 ? 'star.fill' : 'star'}
                  size={18}
                  color={item.importance === 5 ? '#FFD60A' : theme.colors.onSurfaceVariant}
                />
              )}
              onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
            />
          )}
        />
      )}
      <FAB icon="creation" style={styles.fabQuickCapture} onPress={() => navigation.navigate('QuickCapture')} />
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
  fabQuickCapture: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#A788FA' },
});
