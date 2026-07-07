import { useEffect, useRef, useState } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Text, TextInput, IconButton, Card, Chip, ActivityIndicator, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@ui/store/authStore';
import { useContactsStore } from '@ui/store/contactsStore';
import { fetchInteractionsForContacts } from '@data/interactionsRepository';
import { planContactQuery, answerContactQuestion, GeminiServiceError } from '@services/geminiService';
import { selectRelevantContacts, toContactLite, type ChatMessage, type AssistantCitation } from '@domain/assistantChat';

/**
 * AI 個人秘書問答（見 spec.md §5.5a）：兩階段「先查詢、後生成」，跟 Web 版共用同一套
 * geminiProxy actions（planContactQuery/answerContactQuestion），這裡純粹是 UI 重寫。
 */
export function AssistantChatScreen() {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid);
  const { contacts, subscribe } = useContactsStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (uid) return subscribe(uid);
  }, [uid, subscribe]);

  async function handleSend() {
    const question = input.trim();
    if (!question || !uid || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const plan = await planContactQuery(question, toContactLite(contacts));
      const relevantContacts = selectRelevantContacts(contacts, plan);
      const interactionsByContactId = await fetchInteractionsForContacts(uid, relevantContacts.map((c) => c.id));
      const result = await answerContactQuestion(question, relevantContacts, interactionsByContactId);
      setMessages((prev) => [...prev, { role: 'assistant', text: result.answer, citations: result.citations }]);
    } catch (err) {
      setError(err instanceof GeminiServiceError ? err.message : t('assistantChat.genericError'));
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        style={styles.messageList}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyHint}>{t('assistantChat.emptyHint')}</Text>}
        renderItem={({ item }) =>
          item.role === 'assistant' ? (
            <Card style={styles.assistantBubble}>
              <Card.Content>
                <Text variant="labelSmall">{t('assistantChat.assistantLabel')}</Text>
                <Text>{item.text}</Text>
                {item.citations && item.citations.length > 0 && (
                  <View style={styles.citationsRow}>
                    {item.citations.map((c: AssistantCitation, i: number) => (
                      <Chip key={i} compact style={styles.citationChip}>
                        {c.interactionDate
                          ? t('assistantChat.citationWithDate', { name: c.contactName, date: c.interactionDate })
                          : c.contactName}
                      </Chip>
                    ))}
                  </View>
                )}
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.userBubble}>
              <Text style={styles.userBubbleText}>{item.text}</Text>
            </View>
          )
        }
      />
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>{t('assistantChat.thinking')}</Text>
        </View>
      )}
      {error && <HelperText type="error">{error}</HelperText>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={t('assistantChat.inputPlaceholder')}
          value={input}
          onChangeText={setInput}
          disabled={loading}
          onSubmitEditing={handleSend}
        />
        <IconButton icon="send" onPress={handleSend} disabled={loading || !input.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messageList: { flex: 1 },
  list: { padding: 16, gap: 8 },
  emptyHint: { color: '#666', marginTop: 16 },
  assistantBubble: { alignSelf: 'flex-start', maxWidth: '85%', marginBottom: 8 },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: '#5B5FEF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  userBubbleText: { color: '#fff' },
  citationsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  citationChip: { marginRight: 4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  loadingText: { color: '#666' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 4 },
  input: { flex: 1 },
});
