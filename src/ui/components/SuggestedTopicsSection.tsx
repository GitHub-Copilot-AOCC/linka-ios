import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Contact } from '@domain/contact';
import type { TopicSuggestion } from '@domain/topicSuggestion';
import { suggestTopics, GeminiServiceError } from '@services/geminiService';
import { useInteractionsStore, EMPTY_INTERACTIONS } from '@ui/store/interactionsStore';
import { FadeInView } from '@ui/components/FadeInView';

interface SuggestedTopicsSectionProps {
  contact: Contact;
}

/** AI 建議話題（見 spec.md §5.5 項目4）：既有 geminiProxy 的 getSuggestedTopics action，不需改後端。 */
export function SuggestedTopicsSection({ contact }: SuggestedTopicsSectionProps) {
  const { t } = useTranslation();
  const interactions = useInteractionsStore((s) => s.byContactId[contact.id] ?? EMPTY_INTERACTIONS);
  const [suggestions, setSuggestions] = useState<TopicSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await suggestTopics(contact, interactions);
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof GeminiServiceError ? err.message : t('suggestedTopics.genericError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        {t('contacts.suggestedTopics')}
      </Text>
      <Text style={styles.description}>{t('suggestedTopics.description')}</Text>
      {error && <HelperText type="error">{error}</HelperText>}
      {suggestions?.map((s, i) => (
        <FadeInView key={i}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium">{s.topic}</Text>
              <Text variant="bodySmall" style={styles.reason}>
                {s.reason}
              </Text>
            </Card.Content>
          </Card>
        </FadeInView>
      ))}
      {suggestions?.length === 0 && <Text>{t('suggestedTopics.empty')}</Text>}
      <Button mode="outlined" onPress={handleGenerate} loading={loading} disabled={loading} style={styles.button}>
        {suggestions ? t('suggestedTopics.regenerate') : t('suggestedTopics.generate')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  title: { marginBottom: 4 },
  description: { color: '#666', marginBottom: 8 },
  card: { marginBottom: 8 },
  reason: { color: '#666', marginTop: 2 },
  button: { marginTop: 8 },
});
