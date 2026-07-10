import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Avatar, Button, Dialog, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { AgentSuggestion } from '@domain/agentSuggestion';
import { todayDateString } from '@domain/interaction';
import { useContactsStore } from '@ui/store/contactsStore';
import { useSuggestionsStore } from '@ui/store/suggestionsStore';
import { avatarColorFor } from '@ui/theme/avatarPalette';
import { SFIcon } from '@ui/components/AppIcon';

interface AISuggestionsPanelProps {
  uid: string;
}

interface EditState {
  suggestion: AgentSuggestion;
  description: string;
  date: string;
  nextContactReminder: string;
}

/**
 * Port 自 Web 版 src/ui/components/AISuggestionsPanel.tsx（見 spec.md §5.6、§11.3）：
 * 首頁「今天需要處理」的 AI 主動建議——柔和紫漸層 Hero 卡、頭像 + 訊息 + 一個主要
 * 動作按鈕（採納），修改/忽略是次要文字按鈕。互動邏輯跟 Web 版一致，不是重新設計。
 */
export function AISuggestionsPanel({ uid }: AISuggestionsPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const contacts = useContactsStore((state) => state.contacts);
  const { suggestions, subscribe, dismiss, complete } = useSuggestionsStore();
  const [editState, setEditState] = useState<EditState | null>(null);

  const TYPE_LABEL: Record<AgentSuggestion['type'], string> = {
    birthday: t('aiSuggestions.typeBirthday'),
    long_silence: t('aiSuggestions.typeLongSilence'),
    manual_reminder_due: t('aiSuggestions.typeManualReminderDue'),
  };

  useEffect(() => subscribe(uid), [uid, subscribe]);

  const contactLookup = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);
  const pendingSuggestions = suggestions.filter((suggestion) => suggestion.status === 'pending');

  if (pendingSuggestions.length === 0) return null;

  return (
    <>
      <View style={styles.container}>
        {pendingSuggestions.map((suggestion) => {
          const contact = contactLookup.get(suggestion.contactId);
          return (
            <View
              key={suggestion.id}
              style={[styles.card, { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.roundness }]}
            >
              <View style={styles.headerRow}>
                <SFIcon name="sparkles" size={16} color={theme.colors.primary} />
                <Text variant="bodySmall" style={[styles.headerText, { color: theme.colors.primary }]}>
                  {t('aiSuggestions.title')} · {TYPE_LABEL[suggestion.type]}
                </Text>
              </View>

              <View style={styles.contactRow}>
                <Avatar.Text
                  size={44}
                  label={(contact?.name ?? '?').charAt(0)}
                  style={{ backgroundColor: avatarColorFor(suggestion.contactId) }}
                />
                <View style={styles.contactInfo}>
                  <Text variant="titleMedium" numberOfLines={1}>
                    {contact?.name ?? t('aiSuggestions.unknownContact')}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                    {suggestion.message}
                  </Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Button
                  mode="contained"
                  compact
                  onPress={() =>
                    complete(uid, suggestion, contact?.name ?? '', {
                      description: t('aiSuggestions.adoptedDescription', { message: suggestion.message }),
                    })
                  }
                >
                  {t('aiSuggestions.adopt')}
                </Button>
                <Button
                  compact
                  onPress={() =>
                    setEditState({
                      suggestion,
                      description: suggestion.message,
                      date: todayDateString(),
                      nextContactReminder:
                        suggestion.type === 'manual_reminder_due' ? '' : contact?.nextContactReminder ?? '',
                    })
                  }
                >
                  {t('aiSuggestions.edit')}
                </Button>
                <Button compact textColor={theme.colors.onSurfaceVariant} onPress={() => dismiss(uid, suggestion.id)}>
                  {t('aiSuggestions.dismiss')}
                </Button>
              </View>
            </View>
          );
        })}
      </View>

      <Portal>
        <Dialog visible={Boolean(editState)} onDismiss={() => setEditState(null)}>
          <Dialog.Title>{t('aiSuggestions.editTitle')}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {editState && (
              <>
                <TextInput
                  label={t('aiSuggestions.interactionDescription')}
                  value={editState.description}
                  onChangeText={(v) => setEditState({ ...editState, description: v })}
                  multiline
                />
                <TextInput
                  label={t('aiSuggestions.interactionDate')}
                  value={editState.date}
                  onChangeText={(v) => setEditState({ ...editState, date: v })}
                  placeholder="YYYY-MM-DD"
                />
                <TextInput
                  label={t('aiSuggestions.nextReminderOptional')}
                  value={editState.nextContactReminder}
                  onChangeText={(v) => setEditState({ ...editState, nextContactReminder: v })}
                  placeholder="YYYY-MM-DD"
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditState(null)}>{t('common.cancel')}</Button>
            <Button
              onPress={async () => {
                if (!editState) return;
                const contactName = contactLookup.get(editState.suggestion.contactId)?.name ?? '';
                await complete(uid, editState.suggestion, contactName, {
                  description: editState.description,
                  date: editState.date,
                  nextContactReminder: editState.nextContactReminder || undefined,
                });
                setEditState(null);
              }}
            >
              {t('common.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: { padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  headerText: { fontWeight: '700' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactInfo: { flex: 1, minWidth: 0 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
  dialogContent: { gap: 12 },
});
