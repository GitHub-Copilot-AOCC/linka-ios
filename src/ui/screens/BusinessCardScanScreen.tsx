import { useState } from 'react';
import { ScrollView, View, StyleSheet, Image } from 'react-native';
import { Button, HelperText, Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import type { BusinessCardFields } from '@domain/businessCard';
import { scanBusinessCard, GeminiServiceError } from '@services/geminiService';
import { pickImage } from '@platform/filePicker';
import { compressImage } from '@platform/imageCompression';
import { useAuthStore } from '@ui/store/authStore';
import { useContactsStore } from '@ui/store/contactsStore';

type Props = NativeStackScreenProps<ContactsStackParamList, 'BusinessCardScan'>;

/** 名片 OCR（見 spec.md §5.5 項目1）：拍照/選圖 → AI 辨識 → 預覽確認 → 建立聯絡人。 */
export function BusinessCardScanScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid);
  const add = useContactsStore((s) => s.add);

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [fields, setFields] = useState<BusinessCardFields | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickImage(source: 'camera' | 'library') {
    const picked = await pickImage({ source });
    if (!picked) return;

    setLoading(true);
    setError(null);
    setFields(null);
    try {
      const compressedUri = await compressImage(picked.uri);
      setPreviewUri(compressedUri);
      const base64Data = await FileSystem.readAsStringAsync(compressedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const result = await scanBusinessCard(base64Data, 'image/jpeg');
      if (!result) {
        setError(t('businessCard.noNameError'));
      } else {
        setFields(result);
      }
    } catch (err) {
      setError(err instanceof GeminiServiceError ? err.message : t('businessCard.genericError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!uid || !fields) return;
    setSaving(true);
    const result = await add(uid, { ...fields, source: 'ocr' });
    setSaving(false);
    if (result.ok) navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.description}>{t('businessCard.description')}</Text>
      {error && <HelperText type="error">{error}</HelperText>}

      {!fields && (
        <View style={styles.buttonRow}>
          <Button mode="contained" icon="camera" onPress={() => handlePickImage('camera')} disabled={loading}>
            {t('businessCard.chooseImage')}
          </Button>
          <Button mode="outlined" icon="image" onPress={() => handlePickImage('library')} disabled={loading}>
            {t('import.chooseFile')}
          </Button>
        </View>
      )}

      {loading && <ActivityIndicator style={styles.loading} />}

      {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="contain" />}

      {fields && (
        <View style={styles.fields}>
          <TextInput label={t('contacts.name')} value={fields.name} onChangeText={(v) => setFields({ ...fields, name: v })} style={styles.input} />
          <TextInput label={t('editContact.role')} value={fields.role ?? ''} onChangeText={(v) => setFields({ ...fields, role: v })} style={styles.input} />
          <TextInput label={t('contacts.company')} value={fields.company ?? ''} onChangeText={(v) => setFields({ ...fields, company: v })} style={styles.input} />
          <TextInput label={t('editContact.phone')} value={fields.phone ?? ''} onChangeText={(v) => setFields({ ...fields, phone: v })} style={styles.input} />
          <TextInput label={t('auth.email')} value={fields.email ?? ''} onChangeText={(v) => setFields({ ...fields, email: v })} style={styles.input} />
          <Button mode="contained" onPress={handleConfirm} loading={saving} disabled={saving}>
            {t('businessCard.confirmAdd')}
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  description: { marginBottom: 16, color: '#666' },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  loading: { marginVertical: 16 },
  preview: { width: '100%', height: 160, marginBottom: 16 },
  fields: { marginTop: 8 },
  input: { marginBottom: 8 },
});
