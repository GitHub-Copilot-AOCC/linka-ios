import { useEffect, useRef, useState } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import { Text, TextInput, IconButton, Card, Chip, ActivityIndicator, HelperText, useTheme } from 'react-native-paper';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@ui/store/authStore';
import { useContactsStore } from '@ui/store/contactsStore';
import { useInteractionsStore } from '@ui/store/interactionsStore';
import { fetchInteractionsForContacts } from '@data/interactionsRepository';
import { planContactQuery, answerContactQuestion, GeminiServiceError } from '@services/geminiService';
import { selectRelevantContacts, toContactLite, type ChatMessage, type AssistantCitation } from '@domain/assistantChat';
import { upcomingBirthdays, type Contact } from '@domain/contact';
import { latestInteractionDateByContactId, isLongSilence, todayDateString } from '@domain/interaction';
import { SFIcon } from '@ui/components/AppIcon';
import { FadeInView } from '@ui/components/FadeInView';
import { CARD_SHADOW } from '@ui/theme/theme';
import type { SFSymbol } from 'sf-symbols-typescript';

/**
 * AI 個人秘書問答（見 spec.md §5.5a）：兩階段「先查詢、後生成」，跟 Web 版共用同一套
 * geminiProxy actions（planContactQuery/answerContactQuestion），這裡純粹是 UI 重寫。
 * 視覺重新設計：空狀態改成歡迎卡片 + 建議問題 + 快速操作 2x2 格線，數字全部是既有
 * domain 函式已經算好的資料（isLongSilence/upcomingBirthdays/importance），沒有新寫
 * 計算邏輯；點擊快速操作直接送出對應問題，跟輸入框走同一套既有問答流程。
 */
export function AssistantChatScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  // Tab Bar 改成浮動毛玻璃（position:'absolute'）之後，畫面不會自動保留底部空間——這個
  // 畫面的輸入框本來就緊貼畫面最下緣，沒有這個 padding 會直接被浮動的 Tab Bar 蓋住整個
  // 消失（見使用者回報：AI 秘書問答沒有輸入框）。
  const tabBarHeight = useBottomTabBarHeight();
  const uid = useAuthStore((s) => s.user?.uid);
  const displayName = useAuthStore((s) => s.user?.displayName);
  const email = useAuthStore((s) => s.user?.email);
  const { contacts, subscribe } = useContactsStore();
  const allInteractions = useInteractionsStore((s) => s.all);
  const subscribeAllInteractions = useInteractionsStore((s) => s.subscribeAll);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubContacts = subscribe(uid);
    const unsubInteractions = subscribeAllInteractions(uid);
    return () => {
      unsubContacts();
      unsubInteractions();
    };
  }, [uid, subscribe, subscribeAllInteractions]);

  async function sendQuestion(question: string) {
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

  function handleSend() {
    return sendQuestion(input.trim());
  }

  const today = todayDateString();
  const latestByContact = latestInteractionDateByContactId(allInteractions);
  const longSilenceCount = contacts.filter((c: Contact) => isLongSilence(latestByContact.get(c.id), today)).length;
  const birthdaysCount = upcomingBirthdays(contacts, today, 30).length;
  const importantCount = contacts.filter((c: Contact) => c.importance === 5).length;

  const suggestions = [
    t('assistantChat.suggestion1'),
    t('assistantChat.suggestion2'),
    t('assistantChat.suggestion3'),
    t('assistantChat.suggestion4'),
  ];

  const quickActions: Array<{ icon: SFSymbol; color: string; label: string; count: number; question: string }> = [
    {
      icon: 'clock.fill',
      color: theme.colors.error,
      label: t('assistantChat.quickLongSilence'),
      count: longSilenceCount,
      question: t('assistantChat.quickLongSilenceQuestion'),
    },
    {
      icon: 'birthday.cake.fill',
      color: theme.colors.tertiary,
      label: t('assistantChat.quickBirthdays'),
      count: birthdaysCount,
      question: t('assistantChat.quickBirthdaysQuestion'),
    },
    {
      icon: 'star.fill',
      color: '#FFD60A',
      label: t('assistantChat.quickImportant'),
      count: importantCount,
      question: t('assistantChat.quickImportantQuestion'),
    },
    {
      icon: 'chart.bar.fill',
      color: theme.colors.secondary,
      label: t('assistantChat.quickInteractions'),
      count: allInteractions.length,
      question: t('assistantChat.quickInteractionsQuestion'),
    },
  ];

  const firstName = (displayName ?? email ?? '').split(/[\s@]/)[0];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        style={styles.messageList}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View>
            <View style={[styles.welcomeCard, { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.roundness }]}>
              <SFIcon name="sparkles" size={28} color={theme.colors.primary} />
              <Text variant="titleLarge" style={styles.welcomeTitle}>
                {t('assistantChat.welcomeTitle', { name: firstName })}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('assistantChat.welcomeSubtitle')}
              </Text>
            </View>

            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('assistantChat.suggestedTitle')}
            </Text>
            <View style={styles.suggestionsWrap}>
              {suggestions.map((s) => (
                <Chip key={s} onPress={() => setInput(s)} style={styles.suggestionChip}>
                  {s}
                </Chip>
              ))}
            </View>

            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('assistantChat.quickActionsTitle')}
            </Text>
            <View style={styles.quickGrid}>
              {quickActions.map((action) => (
                <Pressable
                  key={action.label}
                  onPress={() => sendQuestion(action.question)}
                  style={[styles.quickCard, { backgroundColor: theme.colors.surface, borderRadius: theme.roundness }, CARD_SHADOW]}
                >
                  <SFIcon name={action.icon} size={20} color={action.color} />
                  <Text variant="headlineSmall" style={styles.quickCount}>
                    {action.count}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) =>
          item.role === 'assistant' ? (
            <FadeInView>
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
            </FadeInView>
          ) : (
            <View style={[styles.userBubble, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.userBubbleText}>{item.text}</Text>
            </View>
          )
        }
      />
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>{t('assistantChat.thinking')}</Text>
        </View>
      )}
      {error && <HelperText type="error">{error}</HelperText>}
      <View style={[styles.inputRow, { paddingBottom: tabBarHeight + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder={t('assistantChat.inputPlaceholder')}
          value={input}
          onChangeText={setInput}
          disabled={loading}
          onSubmitEditing={handleSend}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
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
  welcomeCard: { padding: 20, alignItems: 'flex-start', gap: 6, marginBottom: 20 },
  welcomeTitle: { marginTop: 4 },
  sectionTitle: { marginBottom: 10 },
  suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  suggestionChip: {},
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: { width: '47%', padding: 16, gap: 4 },
  quickCount: { fontWeight: '700' },
  assistantBubble: { alignSelf: 'flex-start', maxWidth: '85%', marginBottom: 8 },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  userBubbleText: { color: '#fff' },
  citationsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  citationChip: { marginRight: 4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  loadingText: {},
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 4 },
  input: { flex: 1, backgroundColor: 'transparent' },
});
