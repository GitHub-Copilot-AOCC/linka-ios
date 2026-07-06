import { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, Button, Checkbox, HelperText, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import { parseVCardFile, findDuplicateContact, type ParsedVCardContact } from '@domain/vcard';
import { pickDocument } from '@platform/filePicker';
import { useContactsStore } from '@ui/store/contactsStore';
import { useAuthStore } from '@ui/store/authStore';

type Props = NativeStackScreenProps<ContactsStackParamList, 'ImportContacts'>;

/** vCard (.vcf) 匯入（見 spec.md §5.9）：解析 → 預覽勾選（重複資料預設不勾選）→ 批次寫入。 */
export function ImportContactsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid);
  const { contacts, add } = useContactsStore();

  const [parsed, setParsed] = useState<ParsedVCardContact[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function handlePickFile() {
    const file = await pickDocument({ mimeTypes: ['text/vcard', 'text/x-vcard'] });
    if (!file) return;
    setError(null);
    try {
      const text = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const result = parseVCardFile(text);
      if (result.length === 0) {
        setError(t('import.noContactsFound'));
        return;
      }
      setParsed(result);
      const nonDuplicateIndexes = result
        .map((c, i) => (findDuplicateContact(contacts, c) ? -1 : i))
        .filter((i) => i >= 0);
      setSelected(new Set(nonDuplicateIndexes));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleImport() {
    if (!uid) return;
    setImporting(true);
    let successCount = 0;
    for (const index of selected) {
      const c = parsed[index];
      const result = await add(uid, { ...c, source: 'vcard_import' });
      if (result.ok) successCount++;
    }
    setImporting(false);
    if (successCount > 0) navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error && <HelperText type="error">{error}</HelperText>}

      {parsed.length === 0 ? (
        <>
          <Text style={styles.description}>{t('import.description')}</Text>
          <Button mode="contained" onPress={handlePickFile}>
            {t('import.chooseFile')}
          </Button>
        </>
      ) : (
        <View>
          <Text style={styles.description}>{t('import.foundCount', { count: parsed.length })}</Text>
          {parsed.map((c, i) => {
            const duplicate = findDuplicateContact(contacts, c);
            return (
              <View key={i} style={styles.row}>
                <Checkbox status={selected.has(i) ? 'checked' : 'unchecked'} onPress={() => toggle(i)} />
                <View style={styles.rowText}>
                  <Text>{[c.name, c.company].filter(Boolean).join(' · ')}</Text>
                  {duplicate && (
                    <Chip compact style={styles.duplicateChip}>
                      {t('import.duplicate')}
                    </Chip>
                  )}
                </View>
              </View>
            );
          })}
          <Button mode="contained" onPress={handleImport} loading={importing} disabled={importing || selected.size === 0} style={styles.button}>
            {t('import.importSelected', { count: selected.size })}
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  description: { color: '#666', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rowText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  duplicateChip: {},
  button: { marginTop: 12 },
});
