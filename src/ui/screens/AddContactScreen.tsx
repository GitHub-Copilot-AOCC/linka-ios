import { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Avatar, ActivityIndicator, Button, HelperText, IconButton } from 'react-native-paper';
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
import { pickImage } from '@platform/filePicker';
import { compressImage } from '@platform/imageCompression';
import { MAX_PHOTOS_PER_CONTACT } from '@domain/contact';

type Props = NativeStackScreenProps<ContactsStackParamList, 'AddContact'>;

/**
 * 新增聯絡人（見 spec.md §5.2）：跟 Web 版「快速新增」對話框對應。名片辨識掃描完會帶著
 * 辨識出的欄位跟照片（`route.params.initialValues`／`pendingPhotoUris`）導到這裡，跟手動
 * 新增走同一份完整表單，使用者確認/修改後才按「儲存」，不會掃描完就直接寫入資料庫。
 *
 * 照片：新聯絡人在儲存前沒有 contactId，沒辦法像 ContactDetailScreen 那樣邊選邊上傳，
 * 這裡先把使用者選的照片（以及名片掃描帶過來的照片）都存在本地 state 當預覽用的 uri，
 * 等 `add()` 拿到真正的 contactId 之後才依序真的上傳（見使用者回報：新增聯絡人畫面原本
 * 完全沒有「新增照片」的入口，只有編輯既有聯絡人才有）。
 */
export function AddContactScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid);
  const add = useContactsStore((s) => s.add);
  const subscribeTags = useTagsStore((s) => s.subscribe);
  const [values, setValues] = useState({ ...EMPTY_CONTACT_FORM_VALUES, ...route.params?.initialValues });
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [photoUris, setPhotoUris] = useState<string[]>(route.params?.pendingPhotoUris ?? []);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (uid) return subscribeTags(uid);
  }, [uid, subscribeTags]);

  async function handlePickPhoto() {
    if (photoUris.length >= MAX_PHOTOS_PER_CONTACT) {
      setError(t('editContact.maxPhotosError', { max: MAX_PHOTOS_PER_CONTACT }));
      return;
    }
    const picked = await pickImage({ source: 'library' });
    if (!picked) return;

    setPickingPhoto(true);
    setError(null);
    try {
      const compressedUri = await compressImage(picked.uri);
      setPhotoUris((prev) => [...prev, compressedUri]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPickingPhoto(false);
    }
  }

  function handleRemovePhoto(uri: string) {
    setPhotoUris((prev) => prev.filter((p) => p !== uri));
  }

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
    if (result.ok && result.id && photoUris.length > 0) {
      // 依序上傳、每次都把前一張的回傳值累積進 existingPhotos，順序才會對（名片掃描帶來的
      // 大頭照排最前面），不能每次都傳空陣列，否則後面上傳的會覆蓋掉前一張。上傳失敗不影響
      // 聯絡人已經建立成功這件事。
      try {
        let uploaded: Awaited<ReturnType<typeof uploadContactPhoto>>[] = [];
        for (const uri of photoUris) {
          const blob = await (await fetch(uri)).blob();
          const photo = await uploadContactPhoto(uid, result.id, blob, uploaded);
          uploaded = [...uploaded, photo];
        }
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
  }, [navigation, saving, values, tagIds, photoUris, uid]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <GroupedSection title={t('editContact.photos', { max: MAX_PHOTOS_PER_CONTACT })} style={styles.section}>
        <GroupedRow style={styles.photoRowOverride}>
          <View style={styles.photoRow}>
            {photoUris.map((uri) => (
              <View key={uri} style={styles.photoWrap}>
                <Avatar.Image size={64} source={{ uri }} />
                <IconButton
                  icon="close"
                  size={20}
                  mode="contained"
                  style={styles.photoRemove}
                  onPress={() => handleRemovePhoto(uri)}
                />
              </View>
            ))}
            {photoUris.length < MAX_PHOTOS_PER_CONTACT && (
              <IconButton icon="plus" mode="outlined" size={28} onPress={handlePickPhoto} disabled={pickingPhoto} />
            )}
            {pickingPhoto && <ActivityIndicator />}
          </View>
        </GroupedRow>
      </GroupedSection>

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
  photoRowOverride: { alignItems: 'flex-start', minHeight: 0, paddingVertical: 16 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', flex: 1 },
  photoWrap: { position: 'relative', marginTop: 8, marginRight: 4 },
  photoRemove: { position: 'absolute', top: -6, right: -6, margin: 0 },
});
