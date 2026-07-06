import { View, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

export interface ContactFormValues {
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  birthday: string;
  notes: string;
}

interface ContactFormFieldsProps {
  values: ContactFormValues;
  onChange: (values: ContactFormValues) => void;
  nameError?: string;
}

/**
 * 聯絡人基本欄位（見 spec.md §5.2）：AddContactScreen 跟 ContactDetailScreen 共用同一份表單，
 * 避免兩處重複維護欄位清單。標籤/照片管理留在各自畫面（新增聯絡人時還沒有 contactId，
 * 照片要等聯絡人建立後才能上傳，跟 Web 版「新增」快速對話框不含照片是同一個限制）。
 */
export function ContactFormFields({ values, onChange, nameError }: ContactFormFieldsProps) {
  const { t } = useTranslation();

  function set<K extends keyof ContactFormValues>(key: K, value: string) {
    onChange({ ...values, [key]: value });
  }

  return (
    <View style={styles.container}>
      <TextInput
        label={t('contacts.name')}
        value={values.name}
        onChangeText={(v) => set('name', v)}
        error={Boolean(nameError)}
        style={styles.input}
      />
      <TextInput label={t('editContact.role')} value={values.role} onChangeText={(v) => set('role', v)} style={styles.input} />
      <TextInput
        label={t('contacts.company')}
        value={values.company}
        onChangeText={(v) => set('company', v)}
        style={styles.input}
      />
      <TextInput
        label={t('editContact.phone')}
        value={values.phone}
        onChangeText={(v) => set('phone', v)}
        keyboardType="phone-pad"
        style={styles.input}
      />
      <TextInput
        label={t('auth.email')}
        value={values.email}
        onChangeText={(v) => set('email', v)}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        label={t('editContact.birthday')}
        value={values.birthday}
        onChangeText={(v) => set('birthday', v)}
        placeholder="YYYY-MM-DD"
        style={styles.input}
      />
      <TextInput
        label={t('editContact.notes')}
        value={values.notes}
        onChangeText={(v) => set('notes', v)}
        multiline
        numberOfLines={3}
        style={styles.input}
      />
    </View>
  );
}

export const EMPTY_CONTACT_FORM_VALUES: ContactFormValues = {
  name: '',
  role: '',
  company: '',
  phone: '',
  email: '',
  birthday: '',
  notes: '',
};

const styles = StyleSheet.create({
  container: { gap: 4 },
  input: { marginBottom: 8 },
});
