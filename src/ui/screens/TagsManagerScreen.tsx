import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Chip, HelperText, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useTagsStore } from '@ui/store/tagsStore';
import { useAuthStore } from '@ui/store/authStore';
import { tagStyleFor } from '@ui/theme/tagPalette';

/** 標籤管理（見 spec.md §5.2）：預設分類 + 使用者自訂標籤的新增/刪除。 */
export function TagsManagerScreen() {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid);
  const { tags, subscribe, add, remove } = useTagsStore();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (uid) return subscribe(uid);
  }, [uid, subscribe]);

  async function handleAdd() {
    if (!uid) return;
    const result = await add(uid, { name });
    if (result.ok) {
      setName('');
      setError(null);
    } else {
      setError(result.error ?? null);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        {t('tags.title')}
      </Text>
      <View style={styles.row}>
        <TextInput
          label={t('tags.newTagLabel')}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <Button mode="contained" onPress={handleAdd}>
          {t('common.add')}
        </Button>
      </View>
      {error && <HelperText type="error">{error}</HelperText>}
      <View style={styles.chipRow}>
        {tags.map((tag) => {
          const style = tagStyleFor(tag.id);
          return (
            <Chip
              key={tag.id}
              icon={style.icon}
              onClose={() => uid && remove(uid, tag.id)}
              style={[styles.chip, { backgroundColor: style.bg }]}
              textStyle={[styles.chipText, { color: style.fg }]}
            >
              {tag.name}
            </Chip>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  input: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { marginRight: 4 },
  // 中文字元的行高需求比 Chip 內建的西文預設值高，不然下緣會被裁掉（見 ContactsListScreen.tsx 同樣註解）。
  chipText: { lineHeight: 22 },
});
