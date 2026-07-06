import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import { ContactFormFields, EMPTY_CONTACT_FORM_VALUES } from '@ui/components/ContactFormFields';
import { useContactsStore } from '@ui/store/contactsStore';
import { useAuthStore } from '@ui/store/authStore';

type Props = NativeStackScreenProps<ContactsStackParamList, 'AddContact'>;

/** 新增聯絡人（見 spec.md §5.2）：跟 Web 版「快速新增」對話框對應，不含照片/標籤，存完直接回列表。 */
export function AddContactScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid);
  const add = useContactsStore((s) => s.add);
  const [values, setValues] = useState(EMPTY_CONTACT_FORM_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!uid) return;
    setSaving(true);
    setError(null);
    const result = await add(uid, {
      name: values.name,
      role: values.role || undefined,
      company: values.company || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      birthday: values.birthday || undefined,
      notes: values.notes || undefined,
    });
    setSaving(false);
    if (result.ok) {
      navigation.goBack();
    } else {
      setError(Object.values(result.errors ?? {})[0] ?? 'Save failed');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ContactFormFields values={values} onChange={setValues} nameError={error ?? undefined} />
      {error && <HelperText type="error">{error}</HelperText>}
      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
        {t('common.save')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
});
