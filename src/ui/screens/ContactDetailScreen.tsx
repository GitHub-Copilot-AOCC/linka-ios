import { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { Button, HelperText, Text, Avatar, IconButton, ActivityIndicator, TextInput, Snackbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import { ContactFormFields, type ContactFormValues } from '@ui/components/ContactFormFields';
import { ContactInteractionsSection } from '@ui/components/ContactInteractionsSection';
import { SuggestedTopicsSection } from '@ui/components/SuggestedTopicsSection';
import { ContactResearchSection } from '@ui/components/ContactResearchSection';
import { TagMultiSelect } from '@ui/components/TagMultiSelect';
import { GroupedSection } from '@ui/components/GroupedSection';
import { GroupedRow } from '@ui/components/GroupedRow';
import { useContactsStore } from '@ui/store/contactsStore';
import { useAuthStore } from '@ui/store/authStore';
import { useTagsStore } from '@ui/store/tagsStore';
import { MAX_PHOTOS_PER_CONTACT } from '@domain/contact';
import type { ContactPhoto } from '@domain/contact';
import { uploadContactPhoto, removeContactPhoto } from '@data/contactsRepository';
import { pickImage } from '@platform/filePicker';
import { compressImage } from '@platform/imageCompression';

type Props = NativeStackScreenProps<ContactsStackParamList, 'ContactDetail'>;

function toFormValues(contact: ReturnType<typeof useContactsStore.getState>['contacts'][number]): ContactFormValues {
  return {
    name: contact.name,
    role: contact.role ?? '',
    company: contact.company ?? '',
    phone: contact.phone ?? '',
    email: contact.email ?? '',
    birthday: contact.birthday ?? '',
    notes: contact.notes ?? '',
  };
}

/** 聯絡人詳情/編輯（見 spec.md §5.2、§11.5）：Phase 2 先做單頁表單，Tabs（互動紀錄等）留給後續 Phase。 */
export function ContactDetailScreen({ route, navigation }: Props) {
  const { contactId } = route.params;
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid);
  const contacts = useContactsStore((s) => s.contacts);
  const update = useContactsStore((s) => s.update);
  const remove = useContactsStore((s) => s.remove);
  const contact = contacts.find((c) => c.id === contactId);

  const subscribeTags = useTagsStore((s) => s.subscribe);
  const [values, setValues] = useState<ContactFormValues | null>(contact ? toFormValues(contact) : null);
  const [reminderDate, setReminderDate] = useState(contact?.nextContactReminder ?? '');
  const [tagIds, setTagIds] = useState<string[]>(contact?.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (uid) return subscribeTags(uid);
  }, [uid, subscribeTags]);

  useEffect(() => {
    if (contact) {
      setValues(toFormValues(contact));
      setReminderDate(contact.nextContactReminder ?? '');
      setTagIds(contact.tags ?? []);
    }
  }, [contact?.id]);

  async function handleSave() {
    if (!uid || !values) return;
    setSaving(true);
    setError(null);
    await update(uid, contactId, {
      name: values.name,
      role: values.role || undefined,
      company: values.company || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      birthday: values.birthday || undefined,
      notes: values.notes || undefined,
      nextContactReminder: reminderDate || undefined,
      tags: tagIds.length > 0 ? tagIds : undefined,
    });
    setSaving(false);
    setShowSaved(true);
  }

  // 「儲存」從畫面中間的大按鈕移到 nav bar 右上角（視覺重新設計，見使用者提供的 mockup +
  // iOS 原生慣例），同時補上存檔成功的 Snackbar——之前這裡完全沒有任何回饋，使用者按了
  // 儲存卻看不出有沒有真的存進去（見使用者回報「按鈕沒生效」）。deps 包含表單狀態，確保
  // header 按鈕呼叫到的 handleSave 永遠讀到最新的值，不是掛載時那份舊的閉包。
  useLayoutEffect(() => {
    navigation.setOptions({
      // 順手修：原本 title 一律靜態顯示空白名字（見 App.tsx 註冊時傳的 { name: '' }），
      // 這裡改成用真正讀到的聯絡人姓名。
      title: contact ? t('editContact.title', { name: contact.name }) : undefined,
      headerRight: () => (
        <Button onPress={handleSave} loading={saving} disabled={saving || !values}>
          {t('common.save')}
        </Button>
      ),
    });
  }, [navigation, saving, values, reminderDate, tagIds, uid, contactId, contact]);

  if (!contact || !values || !uid) {
    return (
      <View style={styles.center}>
        <Text>{t('contactDetail.notFound')}</Text>
      </View>
    );
  }

  const photos = contact.photos ?? [];

  async function handleClearReminder() {
    setReminderDate('');
    await update(uid!, contactId, { nextContactReminder: undefined });
  }

  function handleDelete() {
    Alert.alert(t('deleteContact.title'), t('deleteContact.confirm', { name: contact!.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await remove(uid!, contactId);
          navigation.goBack();
        },
      },
    ]);
  }

  async function handleAddPhoto() {
    if (photos.length >= MAX_PHOTOS_PER_CONTACT) {
      setError(t('editContact.maxPhotosError', { max: MAX_PHOTOS_PER_CONTACT }));
      return;
    }
    const picked = await pickImage({ source: 'library' });
    if (!picked) return;

    setUploading(true);
    setError(null);
    try {
      const compressedUri = await compressImage(picked.uri);
      const blob = await (await fetch(compressedUri)).blob();
      await uploadContactPhoto(uid!, contactId, blob, photos);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto(photo: ContactPhoto) {
    await removeContactPhoto(uid!, contactId, photo, photos);
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <GroupedSection title={t('editContact.photos', { max: MAX_PHOTOS_PER_CONTACT })} style={styles.section}>
          <GroupedRow style={styles.photoRowOverride}>
            <View style={styles.photoRow}>
              {photos.map((photo) => (
                <View key={photo.addedAt} style={styles.photoWrap}>
                  <Avatar.Image size={64} source={{ uri: photo.url }} />
                  <IconButton
                    icon="close"
                    size={14}
                    mode="contained"
                    style={styles.photoRemove}
                    onPress={() => handleRemovePhoto(photo)}
                  />
                </View>
              ))}
              {photos.length < MAX_PHOTOS_PER_CONTACT && (
                <IconButton icon="plus" mode="outlined" size={28} onPress={handleAddPhoto} disabled={uploading} />
              )}
              {uploading && <ActivityIndicator />}
            </View>
          </GroupedRow>
        </GroupedSection>

        <ContactFormFields values={values} onChange={setValues} />

        <GroupedSection title={t('editContact.tags')} style={styles.section}>
          <GroupedRow style={styles.photoRowOverride}>
            <TagMultiSelect selectedIds={tagIds} onChange={setTagIds} />
          </GroupedRow>
        </GroupedSection>

        <GroupedSection title={t('setReminder.title', { name: contact.name })} style={styles.section}>
          <GroupedRow icon="bell.fill" iconBackgroundColor="#FF3B30">
            <TextInput
              label={t('setReminder.dateLabel')}
              value={reminderDate}
              onChangeText={setReminderDate}
              placeholder="YYYY-MM-DD"
              style={styles.inlineInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              dense
            />
          </GroupedRow>
          {reminderDate && (
            <GroupedRow icon="xmark.circle" label={t('setReminder.clear')} onPress={handleClearReminder} />
          )}
        </GroupedSection>

        {error && <HelperText type="error">{error}</HelperText>}

        <GroupedSection style={styles.section}>
          <GroupedRow icon="trash" label={t('common.delete')} destructive onPress={handleDelete} />
        </GroupedSection>

        <ContactInteractionsSection uid={uid} contactId={contactId} contactName={contact.name} />
        <SuggestedTopicsSection contact={contact} />
        <ContactResearchSection uid={uid} contact={contact} />
      </ScrollView>
      <Snackbar visible={showSaved} onDismiss={() => setShowSaved(false)} duration={2000}>
        {t('editContact.saveSuccess')}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 16 },
  photoRowOverride: { alignItems: 'flex-start', minHeight: 0 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', flex: 1 },
  photoWrap: { position: 'relative' },
  photoRemove: { position: 'absolute', top: -8, right: -8, margin: 0 },
  inlineInput: { flex: 1, backgroundColor: 'transparent' },
});
