import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Card,
  Chip,
  Checkbox,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import { todayDateString } from '@domain/interaction';
import { parseQuickCapturePreview, type QuickCapturePreview, GeminiServiceError } from '@services/geminiService';
import { useContactsStore } from '@ui/store/contactsStore';
import { useAuthStore } from '@ui/store/authStore';
import { createInteraction } from '@data/interactionsRepository';
import { createLogEntry } from '@data/logsRepository';
import { updateContact } from '@data/contactsRepository';
import { useVoiceRecorder } from '@platform/audioRecorder';

type Props = NativeStackScreenProps<ContactsStackParamList, 'QuickCapture'>;

type CaptureMode = 'text' | 'audio';

/** AI 語音／文字快速記錄（見 spec.md §5.3a）：預覽確認流程，未確認前不寫入任何資料。 */
export function QuickCaptureScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid);
  const { contacts, add: addContact } = useContactsStore();
  const recorder = useVoiceRecorder();

  const [mode, setMode] = useState<CaptureMode>('text');
  const [textInput, setTextInput] = useState('');
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [preview, setPreview] = useState<QuickCapturePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminderSelection, setReminderSelection] = useState<Record<string, boolean>>({});
  const [importanceSelection, setImportanceSelection] = useState<Record<string, boolean>>({});

  const contactLookup = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  async function handleToggleRecording() {
    if (recorder.isRecording) {
      const { uri } = await recorder.stop();
      setRecordedUri(uri);
    } else {
      setRecordedUri(null);
      await recorder.start();
    }
  }

  async function handleGeneratePreview() {
    if (!uid) return;
    if (mode === 'text' && textInput.trim().length === 0) {
      setError(t('quickCapture.textRequiredError'));
      return;
    }
    if (mode === 'audio' && !recordedUri) {
      setError(t('quickCapture.audioRequiredError'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const audioBase64 = recordedUri
        ? await FileSystem.readAsStringAsync(recordedUri, { encoding: FileSystem.EncodingType.Base64 })
        : undefined;
      const nextPreview = await parseQuickCapturePreview({
        textInput: textInput.trim() || undefined,
        audioBase64,
        audioMimeType: audioBase64 ? 'audio/m4a' : undefined,
        existingContacts: contacts.map((c) => ({
          id: c.id,
          name: c.name,
          company: c.company,
          role: c.role,
          importance: c.importance,
          nextContactReminder: c.nextContactReminder,
          birthday: c.birthday,
        })),
        today: todayDateString(),
      });
      setPreview(nextPreview);
      setReminderSelection(Object.fromEntries(nextPreview.reminderSuggestions.map((s) => [s.contactReferenceId, true])));
      setImportanceSelection(Object.fromEntries(nextPreview.importanceSuggestions.map((s) => [s.contactReferenceId, false])));
    } catch (err) {
      setError(err instanceof GeminiServiceError ? err.message : t('quickCapture.genericError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!preview || !uid) return;
    setSaving(true);
    setError(null);

    try {
      const referenceMap = new Map<string, string[]>();

      for (const match of preview.contactMatches) {
        if (match.matchedContactIds.length > 0) {
          referenceMap.set(match.referenceId, match.matchedContactIds);
          continue;
        }
        if (!match.suggestedNewContactName) {
          referenceMap.set(match.referenceId, []);
          continue;
        }
        const created = await addContact(uid, { name: match.suggestedNewContactName });
        if (!created.ok || !created.id) {
          throw new Error(t('quickCapture.createContactError', { name: match.suggestedNewContactName }));
        }
        referenceMap.set(match.referenceId, [created.id]);
      }

      for (const interaction of preview.suggestedInteractions) {
        const contactIds = interaction.contactReferenceIds.flatMap((id) => referenceMap.get(id) ?? []);
        if (contactIds.length === 0) continue;
        await createInteraction(uid, {
          contactIds,
          type: interaction.type,
          description: interaction.description,
          date: interaction.date,
          source: 'ai_quick_capture',
          rawInput: textInput.trim() || interaction.rawInput,
        });
      }

      for (const reminder of preview.reminderSuggestions) {
        if (!reminderSelection[reminder.contactReferenceId]) continue;
        const [contactId] = referenceMap.get(reminder.contactReferenceId) ?? [];
        if (!contactId) continue;
        await updateContact(uid, contactId, { nextContactReminder: reminder.suggestedDate });
      }

      for (const suggestion of preview.importanceSuggestions) {
        if (!importanceSelection[suggestion.contactReferenceId]) continue;
        const [contactId] = referenceMap.get(suggestion.contactReferenceId) ?? [];
        if (!contactId) continue;
        await updateContact(uid, contactId, { importance: suggestion.suggestedImportance });
      }

      await createLogEntry(uid, {
        action: t('quickCapture.logAction'),
        contactName: preview.contactMatches
          .map((item) => {
            const matched = item.matchedContactIds.map((id) => contactLookup.get(id)?.name).filter(Boolean).join('、');
            return matched || item.suggestedNewContactName || t('aiSuggestions.unknownContact');
          })
          .join('、'),
        type: 'interaction',
        details: preview.summary,
      });

      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('quickCapture.genericError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error && <HelperText type="error">{error}</HelperText>}

      <SegmentedButtons
        value={mode}
        onValueChange={(v) => setMode(v as CaptureMode)}
        style={styles.modeToggle}
        buttons={[
          { value: 'text', label: t('quickCapture.modeText') },
          { value: 'audio', label: t('quickCapture.modeAudio') },
        ]}
      />

      {mode === 'text' ? (
        <TextInput
          label={t('quickCapture.textInputLabel')}
          value={textInput}
          onChangeText={setTextInput}
          placeholder={t('quickCapture.textInputPlaceholder')}
          multiline
          numberOfLines={4}
          style={styles.input}
        />
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall">{t('quickCapture.audioTitle')}</Text>
            <Text variant="bodySmall" style={styles.description}>
              {t('quickCapture.audioDescription')}
            </Text>
            <Button
              mode="contained"
              icon={recorder.isRecording ? 'stop' : 'microphone'}
              onPress={handleToggleRecording}
              style={styles.recordButton}
            >
              {recorder.isRecording ? t('quickCapture.stopRecording') : t('quickCapture.startRecording')}
            </Button>
            {recordedUri && !recorder.isRecording && <Text variant="bodySmall">{t('quickCapture.recordedSize', { kb: 0 })}</Text>}
          </Card.Content>
        </Card>
      )}

      <Button
        mode="contained"
        onPress={handleGeneratePreview}
        loading={loading}
        disabled={loading || saving || recorder.isRecording}
        style={styles.button}
      >
        {loading ? t('quickCapture.generating') : t('quickCapture.generatePreview')}
      </Button>

      {preview && (
        <View style={styles.previewSection}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall">{t('quickCapture.summaryTitle')}</Text>
              <Text variant="bodyMedium">{preview.summary}</Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall">{t('quickCapture.contactMatchesTitle')}</Text>
              {preview.contactMatches.map((match) => (
                <View key={match.referenceId} style={styles.matchRow}>
                  <View style={styles.chipRow}>
                    <Chip compact>{match.confidence}</Chip>
                    {match.matchedContactIds.map((id) => {
                      const c = contactLookup.get(id);
                      const label = c ? [c.name, c.company].filter(Boolean).join(' · ') : t('common.deletedContact');
                      return (
                        <Chip key={id} compact>
                          {label}
                        </Chip>
                      );
                    })}
                    {match.suggestedNewContactName && (
                      <Chip compact mode="outlined">
                        {t('quickCapture.newContactChip', { name: match.suggestedNewContactName })}
                      </Chip>
                    )}
                  </View>
                  <Text variant="bodySmall" style={styles.description}>
                    {match.reason}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall">{t('quickCapture.suggestedInteractionsTitle')}</Text>
              {preview.suggestedInteractions.map((interaction, i) => (
                <View key={`${interaction.date}-${i}`} style={styles.matchRow}>
                  <View style={styles.chipRow}>
                    <Chip compact>{interaction.type}</Chip>
                    <Chip compact mode="outlined">
                      {interaction.date}
                    </Chip>
                  </View>
                  <Text variant="bodyMedium">{interaction.description}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>

          {preview.reminderSuggestions.length > 0 && (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleSmall">{t('quickCapture.reminderSuggestionsTitle')}</Text>
                {preview.reminderSuggestions.map((s) => (
                  <View key={s.contactReferenceId} style={styles.checkboxRow}>
                    <Checkbox
                      status={reminderSelection[s.contactReferenceId] ? 'checked' : 'unchecked'}
                      onPress={() =>
                        setReminderSelection((state) => ({ ...state, [s.contactReferenceId]: !state[s.contactReferenceId] }))
                      }
                    />
                    <Text style={styles.checkboxLabel}>{`${s.suggestedDate} · ${s.reason}`}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {preview.importanceSuggestions.length > 0 && (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleSmall">{t('quickCapture.importanceSuggestionsTitle')}</Text>
                {preview.importanceSuggestions.map((s) => (
                  <View key={s.contactReferenceId} style={styles.checkboxRow}>
                    <Checkbox
                      status={importanceSelection[s.contactReferenceId] ? 'checked' : 'unchecked'}
                      onPress={() =>
                        setImportanceSelection((state) => ({ ...state, [s.contactReferenceId]: !state[s.contactReferenceId] }))
                      }
                    />
                    <Text style={styles.checkboxLabel}>
                      {t('quickCapture.importanceSuggestionLabel', { level: s.suggestedImportance, reason: s.reason })}
                    </Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}
        </View>
      )}

      {saving && <ActivityIndicator style={styles.button} />}
      <Button mode="contained" onPress={handleConfirm} disabled={!preview || loading || saving} style={styles.button}>
        {saving ? t('quickCapture.saving') : t('quickCapture.confirmSave')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  modeToggle: { marginBottom: 12 },
  input: { marginBottom: 12 },
  card: { marginBottom: 12 },
  description: { color: '#666' },
  recordButton: { marginTop: 8 },
  button: { marginTop: 8 },
  previewSection: { marginTop: 8 },
  matchRow: { marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxLabel: { flex: 1 },
});
