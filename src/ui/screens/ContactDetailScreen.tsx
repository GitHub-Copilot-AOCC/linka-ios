import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { Button, HelperText, Text, Avatar, IconButton, ActivityIndicator, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import { ContactFormFields, type ContactFormValues } from '@ui/components/ContactFormFields';
import { ContactInteractionsSection } from '@ui/components/ContactInteractionsSection';
import { SuggestedTopicsSection } from '@ui/components/SuggestedTopicsSection';
import { ContactResearchSection } from '@ui/components/ContactResearchSection';
import { TagMultiSelect } from '@ui/components/TagMultiSelect';
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

  if (!contact || !values || !uid) {
    return (
      <View style={styles.center}>
        <Text>{t('contactDetail.notFound')}</Text>
      </View>
    );
  }

  const photos = contact.photos ?? [];

  async function handleSave() {
    setSaving(true);
    setError(null);
    await update(uid!, contactId, {
      name: values!.name,
      role: values!.role || undefined,
      company: values!.company || undefined,
      phone: values!.phone || undefined,
      email: values!.email || undefined,
      birthday: values!.birthday || undefined,
      notes: values!.notes || undefined,
      nextContactReminder: reminderDate || undefined,
      tags: tagIds.length > 0 ? tagIds : undefined,
    });
    setSaving(false);
  }

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('editContact.photos', { max: MAX_PHOTOS_PER_CONTACT })}
      </Text>
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
          <IconButton
            icon="plus"
            mode="outlined"
            size={28}
            onPress={handleAddPhoto}
            disabled={uploading}
          />
        )}
        {uploading && <ActivityIndicator />}
      </View>

      <ContactFormFields values={values} onChange={setValues} />

      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('editContact.tags')}
      </Text>
      <TagMultiSelect selectedIds={tagIds} onChange={setTagIds} />

      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('setReminder.title', { name: contact.name })}
      </Text>
      <TextInput
        label={t('setReminder.dateLabel')}
        value={reminderDate}
        onChangeText={setReminderDate}
        placeholder="YYYY-MM-DD"
        style={styles.input}
      />
      {reminderDate && (
        <Button mode="text" onPress={handleClearReminder}>
          {t('setReminder.clear')}
        </Button>
      )}

      {error && <HelperText type="error">{error}</HelperText>}

      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.button}>
        {t('common.save')}
      </Button>
      <Button mode="outlined" textColor="#ba1a1a" onPress={handleDelete} style={styles.button}>
        {t('common.delete')}
      </Button>

      <ContactInteractionsSection uid={uid} contactId={contactId} contactName={contact.name} />
      <SuggestedTopicsSection contact={contact} />
      <ContactResearchSection uid={uid} contact={contact} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginBottom: 8 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' },
  photoWrap: { position: 'relative' },
  photoRemove: { position: 'absolute', top: -8, right: -8, margin: 0 },
  button: { marginTop: 8 },
  input: { marginBottom: 8 },
});
