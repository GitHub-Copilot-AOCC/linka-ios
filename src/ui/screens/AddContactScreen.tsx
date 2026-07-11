import { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import { ContactFormFields, EMPTY_CONTACT_FORM_VALUES } from '@ui/components/ContactFormFields';
import { TagMultiSelect } from '@ui/components/TagMultiSelect';
import { GroupedSection } from '@ui/components/GroupedSection';
import { GroupedRow } from '@ui/components/GroupedRow';
import { useContactsStore } from '@ui/store/contactsStore';
import { useAuthStore } from '@ui/store/authStore';
import { useTagsStore } from '@ui/store/tagsStore';
import { uploadContactPhoto } from '@data/contactsRepository';

type Props = NativeStackScreenProps<ContactsStackParamList, 'AddContact'>;

/**
 * 新增聯絡人（見 spec.md §5.2）：跟 Web 版「快速新增」對話框對應，不含照片，存完直接回列表。
 * 名片辨識掃描完會帶著辨識出的欄位（`route.params.initialValues`）導到這裡，跟手動新增
 * 走同一份完整表單，使用者確認/修改後才按「儲存」，不會掃描完就直接寫入資料庫。
 */
export function AddContactScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid);
  const add = useContactsStore((s) => s.add);
  const subscribeTags = useTagsStore((s) => s.subscribe);
  const [values, setValues] = useState({ ...EMPTY_CONTACT_FORM_VALUES, ...route.params?.initialValues });
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (uid) return subscribeTags(uid);
  }, [uid, subscribeTags]);

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
      linkedin: values.linkedin || undefined,
      facebook: values.facebook || undefined,
      twitter: values.twitter || undefined,
      birthday: values.birthday || undefined,
      notes: values.notes || undefined,
      tags: tagIds.length > 0 ? tagIds : undefined,
    });
    if (result.ok && result.id && route.params?.pendingPhotoUri) {
      // 名片辨識帶過來的照片，這裡才真的上傳——contactId 要等聯絡人建立成功才存在
      // （跟 ContactDetailScreen.tsx 的 handleAddPhoto 同一個模式）。上傳失敗不影響
      // 聯絡人已經建立成功，最多是這張照片沒進去，不應該讓使用者以為整個新增失敗了。
      try {
        const blob = await (await fetch(route.params.pendingPhotoUri)).blob();
        await uploadContactPhoto(uid, result.id, blob, []);
      } catch (err) {
        console.error('[AddContactScreen] uploadContactPhoto failed:', err);
      }
    }
    setSaving(false);
    if (result.ok) {
      navigation.goBack();
    } else {
      setError(Object.values(result.errors ?? {})[0] ?? 'Save failed');
    }
  }

  // 「儲存」移到 nav bar 右上角（視覺重新設計，跟 ContactDetailScreen 一致，見使用者提供的
  // mockup + iOS 原生慣例）。
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button onPress={handleSave} loading={saving} disabled={saving}>
          {t('common.save')}
        </Button>
      ),
    });
  }, [navigation, saving, values, tagIds, uid]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ContactFormFields values={values} onChange={setValues} nameError={error ?? undefined} />
      <GroupedSection title={t('editContact.tags')} style={styles.section}>
        <GroupedRow style={styles.tagsRowOverride}>
          <TagMultiSelect selectedIds={tagIds} onChange={setTagIds} />
        </GroupedRow>
      </GroupedSection>
      {error && <HelperText type="error">{error}</HelperText>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 16 },
  tagsRowOverride: { alignItems: 'flex-start', minHeight: 0 },
});
