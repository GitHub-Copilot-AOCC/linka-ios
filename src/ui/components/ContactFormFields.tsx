import { View, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { GroupedSection } from '@ui/components/GroupedSection';
import { GroupedRow } from '@ui/components/GroupedRow';

export interface ContactFormValues {
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  linkedin: string;
  facebook: string;
  twitter: string;
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
 *
 * 視覺重新設計：姓名/職稱/公司維持在大頭照下方、不分組（對照 mockup 版面），電話/Email
 * 分到「聯絡方式」、生日/備註（mockup 標「偏好」，同一個 notes 欄位改顯示標籤）分到
 * 「其他資訊」，兩組都走 GroupedSection/GroupedRow（幾乎無邊框、iOS 原生 Grouped List 風格）。
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
        style={styles.plainInput}
        underlineColor="transparent"
        activeUnderlineColor="transparent"
      />
      <TextInput
        label={t('editContact.role')}
        value={values.role}
        onChangeText={(v) => set('role', v)}
        style={styles.plainInput}
        underlineColor="transparent"
        activeUnderlineColor="transparent"
      />
      <TextInput
        label={t('contacts.company')}
        value={values.company}
        onChangeText={(v) => set('company', v)}
        style={styles.plainInput}
        underlineColor="transparent"
        activeUnderlineColor="transparent"
      />

      <GroupedSection title={t('editContact.contactInfoSection')} style={styles.section}>
        <GroupedRow icon="phone.fill" iconBackgroundColor="#34C759">
          <TextInput
            label={t('editContact.phone')}
            value={values.phone}
            onChangeText={(v) => set('phone', v)}
            keyboardType="phone-pad"
            style={styles.inlineInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            dense
          />
        </GroupedRow>
        <GroupedRow icon="envelope.fill" iconBackgroundColor="#6C63FF">
          <TextInput
            label={t('auth.email')}
            value={values.email}
            onChangeText={(v) => set('email', v)}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.inlineInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            dense
          />
        </GroupedRow>
      </GroupedSection>

      <GroupedSection title={t('editContact.socialSection')} style={styles.section}>
        <GroupedRow icon="link" iconBackgroundColor="#0A66C2">
          <TextInput
            label={t('editContact.linkedin')}
            value={values.linkedin}
            onChangeText={(v) => set('linkedin', v)}
            autoCapitalize="none"
            style={styles.inlineInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            dense
          />
        </GroupedRow>
        <GroupedRow icon="link" iconBackgroundColor="#1877F2">
          <TextInput
            label={t('editContact.facebook')}
            value={values.facebook}
            onChangeText={(v) => set('facebook', v)}
            autoCapitalize="none"
            style={styles.inlineInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            dense
          />
        </GroupedRow>
        <GroupedRow icon="link" iconBackgroundColor="#1C1C1E">
          <TextInput
            label={t('editContact.twitter')}
            value={values.twitter}
            onChangeText={(v) => set('twitter', v)}
            autoCapitalize="none"
            style={styles.inlineInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            dense
          />
        </GroupedRow>
      </GroupedSection>

      <GroupedSection title={t('editContact.otherInfoSection')} style={styles.section}>
        <GroupedRow icon="birthday.cake.fill" iconBackgroundColor="#FF9F0A">
          <TextInput
            label={t('editContact.birthday')}
            value={values.birthday}
            onChangeText={(v) => set('birthday', v)}
            placeholder="YYYY-MM-DD"
            style={styles.inlineInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            dense
          />
        </GroupedRow>
        <GroupedRow icon="note.text" iconBackgroundColor="#A788FA">
          <TextInput
            label={t('editContact.notes')}
            value={values.notes}
            onChangeText={(v) => set('notes', v)}
            multiline
            style={styles.inlineInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            dense
          />
        </GroupedRow>
      </GroupedSection>
    </View>
  );
}

export const EMPTY_CONTACT_FORM_VALUES: ContactFormValues = {
  name: '',
  role: '',
  company: '',
  phone: '',
  email: '',
  linkedin: '',
  facebook: '',
  twitter: '',
  birthday: '',
  notes: '',
};

const styles = StyleSheet.create({
  container: { gap: 4 },
  plainInput: { backgroundColor: 'transparent' },
  section: { marginTop: 16 },
  inlineInput: { flex: 1, backgroundColor: 'transparent' },
});
