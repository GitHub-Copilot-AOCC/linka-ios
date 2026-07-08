import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, List, IconButton, SegmentedButtons, TextInput, Button, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { InteractionType } from '@domain/interaction';
import { todayDateString } from '@domain/interaction';
import { useInteractionsStore } from '@ui/store/interactionsStore';

interface ContactInteractionsSectionProps {
  uid: string;
  contactId: string;
  contactName: string;
}

/**
 * 互動紀錄區塊（見 spec.md §5.3）：內嵌在 ContactDetailScreen 底下，取代 Web 版獨立 Dialog
 * 的做法——RN 版目前是單頁表單，加一個 Dialog 反而多一層導覽，先用可展開的清單+表單取代。
 */
export function ContactInteractionsSection({ uid, contactId, contactName }: ContactInteractionsSectionProps) {
  const { t } = useTranslation();
  const interactions = useInteractionsStore((s) => s.byContactId[contactId] ?? []);
  const subscribe = useInteractionsStore((s) => s.subscribe);
  const add = useInteractionsStore((s) => s.add);
  const remove = useInteractionsStore((s) => s.remove);

  const [type, setType] = useState<InteractionType>('meeting');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayDateString());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribe(uid, contactId), [uid, contactId, subscribe]);

  async function handleAdd() {
    setSaving(true);
    setError(null);
    const result = await add(uid, { contactIds: [contactId], type, description, date }, contactName);
    setSaving(false);
    if (result.ok) {
      setDescription('');
      setDate(todayDateString());
    } else {
      setError(Object.values(result.errors ?? {})[0] ?? 'Save failed');
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        {t('contacts.interactions')}
      </Text>

      {interactions.length === 0 ? (
        <Text style={styles.empty}>{t('interactionsDialog.empty')}</Text>
      ) : (
        interactions.map((interaction) => (
          <List.Item
            key={interaction.id}
            title={interaction.description}
            description={`${t(`interactionsDialog.type${capitalize(interaction.type)}`)} · ${interaction.date}`}
            right={() => <IconButton icon="delete" size={18} onPress={() => remove(uid, interaction.id)} />}
          />
        ))
      )}

      <SegmentedButtons
        value={type}
        onValueChange={(v) => setType(v as InteractionType)}
        buttons={[
          { value: 'meeting', label: t('interactionsDialog.typeMeeting') },
          { value: 'call', label: t('interactionsDialog.typeCall') },
          { value: 'email', label: t('interactionsDialog.typeEmail') },
        ]}
        style={styles.segmented}
      />
      <TextInput
        label={t('interactionsDialog.description')}
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />
      <TextInput
        label={t('interactionsDialog.date')}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        style={styles.input}
      />
      {error && <HelperText type="error">{error}</HelperText>}
      <Button mode="outlined" onPress={handleAdd} loading={saving} disabled={saving}>
        {t('interactionsDialog.addInteraction')}
      </Button>
    </View>
  );
}

function capitalize(s: string | undefined): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  title: { marginBottom: 8 },
  empty: { color: '#666', marginBottom: 8 },
  segmented: { marginTop: 8, marginBottom: 8 },
  input: { marginBottom: 8 },
});
