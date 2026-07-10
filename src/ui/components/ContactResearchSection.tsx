import { useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text, Button, Card, Checkbox, IconButton, ActivityIndicator, HelperText, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Contact } from '@domain/contact';
import { createResearchEntry, sortResearchLogNewestFirst, type ExtractedContactFields } from '@domain/contactResearch';
import { researchContactProfile, GeminiServiceError } from '@services/geminiService';
import { appendResearchEntry, removeResearchEntry, updateContact } from '@data/contactsRepository';
import { FadeInView } from '@ui/components/FadeInView';
import { GroupedSection } from '@ui/components/GroupedSection';
import { GroupedRow } from '@ui/components/GroupedRow';

interface ContactResearchSectionProps {
  uid: string;
  contact: Contact;
}

type ExtractableKey = keyof ExtractedContactFields;

const FIELD_LABEL_KEYS: Record<ExtractableKey, string> = {
  role: 'editContact.role',
  company: 'contacts.company',
  linkedin: 'editContact.linkedin',
  facebook: 'editContact.facebook',
  twitter: 'editContact.twitter',
  birthday: 'editContact.birthday',
};

/**
 * 網路身分研究摘要（見 spec.md §5.8，僅文字摘要子功能，已擴充明確搜尋 LinkedIn/Facebook）：
 * 搜尋結果一律附加，不覆蓋既有紀錄。照片搜尋子功能需要額外圖片搜尋 API/憑證，本次不實作
 * （跟 Web 版範圍一致）。
 *
 * 若這次搜尋找到可能補進聯絡人資料的欄位（職稱/公司/LinkedIn/Facebook/Twitter/生日），
 * 顯示一個確認清單讓使用者逐項勾選是否要套用——不會自動覆蓋既有資料（見使用者需求：
 * 找到的資料要先確認才寫入）。這個確認清單只針對「這次剛完成的搜尋」，是暫時的畫面狀態，
 * 不會每次重新打開畫面就對舊的研究紀錄重新顯示候選。
 */
export function ContactResearchSection({ uid, contact }: ContactResearchSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFields, setPendingFields] = useState<ExtractedContactFields | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<ExtractableKey>>(new Set());
  const [applying, setApplying] = useState(false);

  const researchLog = sortResearchLogNewestFirst(contact.researchLog ?? []);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setPendingFields(null);
    try {
      const result = await researchContactProfile(contact);
      const entry = createResearchEntry(result);
      await appendResearchEntry(uid, contact.id, contact.researchLog ?? [], entry);

      if (entry.extractedFields && Object.keys(entry.extractedFields).length > 0) {
        // 只自動勾選聯絡人「目前欄位是空白」的候選；已經有值的欄位仍顯示候選，但預設
        // 不勾選，需要使用者主動勾選才會覆蓋既有資料（見使用者確認的覆蓋行為）。
        const initialSelected = new Set<ExtractableKey>();
        for (const key of Object.keys(entry.extractedFields) as ExtractableKey[]) {
          if (!contact[key]) initialSelected.add(key);
        }
        setPendingFields(entry.extractedFields);
        setSelectedKeys(initialSelected);
      }
    } catch (err) {
      setError(err instanceof GeminiServiceError ? err.message : t('contactResearch.genericError'));
    } finally {
      setLoading(false);
    }
  }

  function toggleField(key: ExtractableKey) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleDeleteEntry(entryId: string) {
    await removeResearchEntry(uid, contact.id, contact.researchLog ?? [], entryId);
  }

  async function handleApplyFields() {
    if (!pendingFields) return;
    setApplying(true);
    try {
      const patch: Partial<Contact> = {};
      for (const key of selectedKeys) {
        const value = pendingFields[key];
        if (value) patch[key] = value;
      }
      if (Object.keys(patch).length > 0) {
        await updateContact(uid, contact.id, patch);
      }
      setPendingFields(null);
    } finally {
      setApplying(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        {t('contactDetail.tabResearch')}
      </Text>
      <HelperText type="info">{t('contactResearch.disclaimer')}</HelperText>
      {error && <HelperText type="error">{error}</HelperText>}

      {loading && <ActivityIndicator style={styles.loading} />}

      {pendingFields && (
        <GroupedSection title={t('contactResearch.fieldsFoundTitle')} style={styles.section}>
          {(Object.keys(pendingFields) as ExtractableKey[]).map((key) => {
            const newValue = pendingFields[key];
            if (!newValue) return null;
            const currentValue = contact[key] as string | undefined;
            return (
              <GroupedRow key={key} onPress={() => toggleField(key)}>
                <Checkbox status={selectedKeys.has(key) ? 'checked' : 'unchecked'} onPress={() => toggleField(key)} />
                <View style={styles.fieldInfo}>
                  <Text>{t(FIELD_LABEL_KEYS[key])}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {currentValue
                      ? t('contactResearch.fieldChangeFrom', { value: currentValue })
                      : t('contactResearch.fieldEmptyValue')}
                    {' → '}
                    {newValue}
                  </Text>
                </View>
              </GroupedRow>
            );
          })}
          <View style={styles.fieldsActionsRow}>
            <Button onPress={() => setPendingFields(null)}>{t('contactResearch.dismissFields')}</Button>
            <Button mode="contained" onPress={handleApplyFields} loading={applying} disabled={applying || selectedKeys.size === 0}>
              {t('contactResearch.applyFields')}
            </Button>
          </View>
        </GroupedSection>
      )}

      {!loading && researchLog.length === 0 && <Text style={styles.empty}>{t('contactResearch.empty')}</Text>}

      {!loading &&
        researchLog.map((entry) => (
          <FadeInView key={entry.id}>
            <Card style={styles.card}>
              <Card.Title
                title={new Date(entry.createdAt).toLocaleString()}
                titleVariant="labelSmall"
                titleStyle={{ color: theme.colors.onSurfaceVariant }}
                right={() => <IconButton icon="delete" size={18} onPress={() => handleDeleteEntry(entry.id)} />}
              />
              <Card.Content>
                <Text variant="bodyMedium">{entry.summary}</Text>
                {(entry.sourceUrls ?? []).length > 0 && (
                  <View style={styles.sources}>
                    <Text variant="labelSmall">{t('contactResearch.sources')}</Text>
                    {entry.sourceUrls.map((url) => (
                      <Text key={url} style={styles.link} onPress={() => Linking.openURL(url)}>
                        {url}
                      </Text>
                    ))}
                  </View>
                )}
              </Card.Content>
            </Card>
          </FadeInView>
        ))}

      <Button mode="contained" onPress={handleSearch} disabled={loading} style={styles.button}>
        {researchLog.length > 0 ? t('contactResearch.searchAgain') : t('contactResearch.search')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  title: { marginBottom: 4 },
  loading: { marginVertical: 16 },
  section: { marginVertical: 8 },
  fieldInfo: { flex: 1 },
  fieldsActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, padding: 8 },
  empty: { color: '#666', marginBottom: 8 },
  card: { marginBottom: 8 },
  sources: { marginTop: 8 },
  link: { color: '#5B5FEF', marginTop: 2 },
  button: { marginTop: 8 },
});
