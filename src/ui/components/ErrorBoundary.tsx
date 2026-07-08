import { Component, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import i18n from '@ui/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 攔截畫面渲染期間未預期的例外（例如 Firestore 舊資料格式跟型別假設不符),避免整個 App
 * 在 release build 下被 RN 判定 fatal 直接砍掉（見使用者回報：點進聯絡人詳情頁就跳出 App）。
 * 只能接住 render/lifecycle 階段的例外——非同步事件（例如 Firestore onSnapshot 的錯誤）
 * 不會經過這裡，那些要在各自的呼叫端處理。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[ErrorBoundary] caught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text variant="titleMedium" style={styles.title}>
            {i18n.t('errorBoundary.title')}
          </Text>
          <Text style={styles.message}>{i18n.t('errorBoundary.message')}</Text>
          <Text style={styles.errorText}>{this.state.error.message}</Text>
          <Button mode="contained" onPress={() => this.setState({ error: null })} style={styles.button}>
            {i18n.t('errorBoundary.retry')}
          </Button>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { marginBottom: 8 },
  message: { color: '#666', textAlign: 'center', marginBottom: 8 },
  errorText: { color: '#ba1a1a', textAlign: 'center', marginBottom: 16 },
  button: { marginTop: 8 },
});
