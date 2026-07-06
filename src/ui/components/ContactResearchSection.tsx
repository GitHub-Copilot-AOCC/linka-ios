import { useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text, Button, Card, ActivityIndicator, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Contact } from '@domain/contact';
import { createResearchEntry, sortResearchLogNewestFirst } from '@domain/contactResearch';
import { researchContactProfile, GeminiServiceError } from '@services/geminiService';
import { appendResearchEntry } from '@data/contactsRepository';

interface ContactResearchSectionProps {
  uid: string;
  contact: Contact;
}

/**
 * 網路身分研究摘要（見 spec.md §5.8，僅文字摘要子功能）：搜尋結果一律附加，不覆蓋既有紀錄。
 * 照片搜尋子功能需要額外圖片搜尋 API/憑證，本次不實作（跟 Web 版範圍一致）。
 */
export function ContactResearchSection({ uid, contact }: ContactResearchSectionProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const researchLog = sortResearchLogNewestFirst(contact.researchLog ?? []);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    try {
      const result = await researchContactProfile(contact);
      const entry = createResearchEntry(result);
      await appendResearchEntry(uid, contact.id, contact.researchLog ?? [], entry);
    } catch (err) {
      setError(err instanceof GeminiServiceError ? err.message : t('contactResearch.genericError'));
    } finally {
      setLoading(false);
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

      {!loading && researchLog.length === 0 && <Text style={styles.empty}>{t('contactResearch.empty')}</Text>}

      {!loading &&
        researchLog.map((entry) => (
          <Card key={entry.id} style={styles.card}>
            <Card.Content>
              <Text variant="labelSmall" style={styles.date}>
                {new Date(entry.createdAt).toLocaleString()}
              </Text>
              <Text variant="bodyMedium">{entry.summary}</Text>
              {entry.sourceUrls.length > 0 && (
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
  empty: { color: '#666', marginBottom: 8 },
  card: { marginBottom: 8 },
  date: { color: '#666', marginBottom: 4 },
  sources: { marginTop: 8 },
  link: { color: '#5B5FEF', marginTop: 2 },
  button: { marginTop: 8 },
});
