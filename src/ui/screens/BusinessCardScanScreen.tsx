import { useState } from 'react';
import { ScrollView, View, StyleSheet, Image } from 'react-native';
import { Button, HelperText, Text, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import { scanBusinessCard, GeminiServiceError } from '@services/geminiService';
import { pickImage } from '@platform/filePicker';
import { compressImage, cropToBoundingBox } from '@platform/imageCompression';

type Props = NativeStackScreenProps<ContactsStackParamList, 'BusinessCardScan'>;

/**
 * 名片 OCR（見 spec.md §5.5 項目1）：拍照/選圖 → AI 辨識 → 導到「新增聯絡人」完整表單
 * 預先帶入辨識結果。不在這裡直接儲存——使用者要能在完整表單上確認/修改所有欄位（包含
 * 標籤、生日等 OCR 不會辨識的欄位）之後才按「儲存」，掃描完不會直接寫入資料庫（見使用者
 * 要求：先填到新聯絡人、確認完所有資料再儲存）。
 */
export function BusinessCardScanScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickImage(source: 'camera' | 'library') {
    const picked = await pickImage({ source });
    if (!picked) return;

    setLoading(true);
    setError(null);
    try {
      const compressedUri = await compressImage(picked.uri);
      setPreviewUri(compressedUri);
      const base64Data = await FileSystem.readAsStringAsync(compressedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const result = await scanBusinessCard(base64Data, 'image/jpeg');
      if (!result) {
        setError(t('businessCard.noNameError'));
        return;
      }

      // 有偵測出合理的名片邊界框才裁切；沒有（或邊界框不合理，見 parseCardBoundingBox
      // 的防呆)就直接用壓縮後的完整照片,不要因為裁切失敗擋住整個新增流程（見使用者要求：
      // 掃描的照片要自動存進聯絡人照片集，並先裁掉名片以外的區域，但裁不出來也不能卡住)。
      const cardPhotoUri = result.cardBoundingBox
        ? await cropToBoundingBox(compressedUri, result.cardBoundingBox).catch(() => compressedUri)
        : compressedUri;

      // 名片上如果印有本人大頭照，裁出來排第一張當頭像（見使用者要求：比整張名片更適合
      // 當大頭照)，名片全圖排第二張留存參考；裁不出來（沒偵測到或裁切失敗)就只留名片全圖。
      const personPhotoUri = result.personPhotoBoundingBox
        ? await cropToBoundingBox(compressedUri, result.personPhotoBoundingBox).catch(() => null)
        : null;
      const pendingPhotoUris = personPhotoUri ? [personPhotoUri, cardPhotoUri] : [cardPhotoUri];

      // 用 replace 而不是 navigate：掃描這一頁的任務結束了，換成新增聯絡人表單，
      // 從那邊按返回應該直接回到聯絡人列表，不是回到這個已經用不到的掃描畫面。
      navigation.replace('AddContact', {
        initialValues: {
          name: result.fields.name,
          role: result.fields.role ?? '',
          company: result.fields.company ?? '',
          phone: result.fields.phone ?? '',
          email: result.fields.email ?? '',
        },
        pendingPhotoUris,
      });
    } catch (err) {
      setError(err instanceof GeminiServiceError ? err.message : t('businessCard.genericError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.description}>{t('businessCard.description')}</Text>
      {error && <HelperText type="error">{error}</HelperText>}

      <View style={styles.buttonRow}>
        <Button mode="contained" icon="camera" onPress={() => handlePickImage('camera')} disabled={loading}>
          {t('businessCard.chooseImage')}
        </Button>
        <Button mode="outlined" icon="image" onPress={() => handlePickImage('library')} disabled={loading}>
          {t('import.chooseFile')}
        </Button>
      </View>

      {loading && <ActivityIndicator style={styles.loading} />}

      {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="contain" />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  description: { marginBottom: 16, color: '#666' },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  loading: { marginVertical: 16 },
  preview: { width: '100%', height: 160, marginBottom: 16 },
});
