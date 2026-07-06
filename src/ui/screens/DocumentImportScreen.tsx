import { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, Button, Checkbox, HelperText, ActivityIndicator, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import {
  detectDocumentType,
  validateDocumentFileSize,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  type ParsedDocumentContact,
} from '@domain/documentImport';
import { findDuplicateContact } from '@domain/vcard';
import { parseContactDocument, GeminiServiceError } from '@services/geminiService';
import { pickDocument } from '@platform/filePicker';
import { useContactsStore } from '@ui/store/contactsStore';
import { useAuthStore } from '@ui/store/authStore';

type Props = NativeStackScreenProps<ContactsStackParamList, 'DocumentImport'>;

/** 文件通訊錄批次匯入（見 spec.md §5.7）：上傳文件 → AI 解析 → 預覽勾選 → 批次寫入。 */
export function DocumentImportScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid);
  const { contacts, add } = useContactsStore();

  const [parsed, setParsed] = useState<ParsedDocumentContact[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickFile() {
    const file = await pickDocument({ mimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'] });
    if (!file) return;

    setError(null);
    setParsed([]);

    const docType = file.fileName ? detectDocumentType(file.fileName) : null;
    if (!docType) {
      setError(t('docImport.unsupportedType'));
      return;
    }
    if (file.size && !validateDocumentFileSize(file.size)) {
      setError(t('docImport.fileTooLarge', { maxMB: MAX_DOCUMENT_FILE_SIZE_BYTES / (1024 * 1024) }));
      return;
    }

    setLoading(true);
    try {
      const base64Data = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const result = await parseContactDocument(base64Data, docType);
      if (result.length === 0) {
        setError(t('docImport.noContactsFound'));
      } else {
        setParsed(result);
        const nonDuplicateIndexes = result
          .map((c, i) => (findDuplicateContact(contacts, c) ? -1 : i))
          .filter((i) => i >= 0);
        setSelected(new Set(nonDuplicateIndexes));
      }
    } catch (err) {
      setError(err instanceof GeminiServiceError ? err.message : t('docImport.genericError'));
    } finally {
      setLoading(false);
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
      const result = await add(uid, { ...c, source: 'doc_import' });
      if (result.ok) successCount++;
    }
    setImporting(false);
    if (successCount > 0) navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error && <HelperText type="error">{error}</HelperText>}

      {parsed.length === 0 && !loading && (
        <>
          <Text style={styles.description}>{t('docImport.description')}</Text>
          <Button mode="contained" icon="file-upload" onPress={handlePickFile}>
            {t('docImport.chooseFile')}
          </Button>
        </>
      )}

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.description}>{t('docImport.parsing')}</Text>
        </View>
      )}

      {parsed.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.description}>{t('docImport.foundCount', { count: parsed.length })}</Text>
          {parsed.map((c, i) => {
            const duplicate = findDuplicateContact(contacts, c);
            return (
              <View key={i} style={styles.row}>
                <Checkbox status={selected.has(i) ? 'checked' : 'unchecked'} onPress={() => toggle(i)} />
                <View style={styles.rowText}>
                  <Text>{[c.name, c.company].filter(Boolean).join(' · ')}</Text>
                  {duplicate && (
                    <Chip compact style={styles.duplicateChip}>
                      {t('docImport.duplicate')}
                    </Chip>
                  )}
                </View>
              </View>
            );
          })}
          <Button mode="contained" onPress={handleImport} loading={importing} disabled={importing || selected.size === 0} style={styles.button}>
            {importing ? t('docImport.importing') : t('docImport.importSelected', { count: selected.size })}
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  description: { color: '#666', marginBottom: 12 },
  loading: { alignItems: 'center', gap: 8, marginTop: 24 },
  previewSection: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rowText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  duplicateChip: {},
  button: { marginTop: 12 },
});
