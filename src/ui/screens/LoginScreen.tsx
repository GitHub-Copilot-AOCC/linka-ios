import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { useAuthStore } from '@ui/store/authStore';

WebBrowser.maybeCompleteAuthSession();

/**
 * Email/密碼登入 + Google 登入（見 spec.md §5.1）。Google 登入用 expo-auth-session 的
 * useIdTokenAuthRequest（見 authRepository.ts 的 signInWithGoogleIdToken 說明），需要在
 * .env 設定 EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID（Google Cloud Console 建立的 iOS 類型
 * OAuth Client ID，Bundle ID 對應 app.json 的 com.linkaios.app）。
 *
 * 已知限制：這個 client id 綁定的是 app 自己的 URL scheme（app.json 的 "linka" scheme），
 * 在 Expo Go 裡執行時實際拿到的 redirect URI 是動態的 exp://，跟 Google Console 設定的不會
 * 一致，這個按鈕在 Expo Go 裡點了大概率會失敗。要測這個功能需要用 EAS 建置 development
 * client 或正式 build，不能只靠 Expo Go（其他所有功能都還是能繼續用 Expo Go 測）。
 */
export function LoginScreen() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [request, response, promptAsync] = useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) {
      loginWithGoogle(response.params.id_token).then((result) => {
        if (!result.ok) setError(result.error ?? 'Google login failed');
      });
    } else if (response?.type === 'error') {
      setError(response.error?.message ?? 'Google login failed');
    }
  }, [response, loginWithGoogle]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(Object.values(result.errors ?? {})[0] ?? 'Login failed');
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        {t('auth.loginTitle')}
      </Text>
      <TextInput
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      {error && <HelperText type="error">{error}</HelperText>}
      <Button mode="contained" onPress={handleSubmit} loading={submitting} disabled={submitting}>
        {t('auth.loginButton')}
      </Button>

      <Divider style={styles.divider} />

      <Button mode="outlined" icon="google" onPress={() => promptAsync()} disabled={!request}>
        {t('auth.googleLogin')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { marginBottom: 24 },
  input: { marginBottom: 12 },
  divider: { marginVertical: 16 },
});
