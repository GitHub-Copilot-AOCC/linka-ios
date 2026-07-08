import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { PaperProvider, MD3LightTheme, ActivityIndicator } from 'react-native-paper';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import '@ui/i18n';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@ui/store/authStore';
import { LoginScreen } from '@ui/screens/LoginScreen';
import { DashboardScreen } from '@ui/screens/DashboardScreen';
import { ContactsListScreen } from '@ui/screens/ContactsListScreen';
import { ContactDetailScreen } from '@ui/screens/ContactDetailScreen';
import { AddContactScreen } from '@ui/screens/AddContactScreen';
import { TagsManagerScreen } from '@ui/screens/TagsManagerScreen';
import { BusinessCardScanScreen } from '@ui/screens/BusinessCardScanScreen';
import { AssistantChatScreen } from '@ui/screens/AssistantChatScreen';
import { QuickCaptureScreen } from '@ui/screens/QuickCaptureScreen';
import { DocumentImportScreen } from '@ui/screens/DocumentImportScreen';
import { ImportContactsScreen } from '@ui/screens/ImportContactsScreen';
import { SettingsScreen } from '@ui/screens/SettingsScreen';
import { OperationLogScreen } from '@ui/screens/OperationLogScreen';
import { ErrorBoundary } from '@ui/components/ErrorBoundary';
import type { ContactsStackParamList } from '@ui/navigation/ContactsStackParamList';
import type { SettingsStackParamList } from '@ui/navigation/SettingsStackParamList';

// 對應 spec.md §4：手機版沿用 Web 版同一套 Material 3 token（見 Web repo src/ui/theme/theme.ts
// 的 PRIMARY 色），react-native-paper 的 theme 物件結構跟 MUI 不同，這裡先用最小可行的顏色覆寫，
// 之後要抽成雙邊共用的 design token 檔案再細修。
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#5B5FEF',
    secondary: '#FF9F43',
  },
};

const Tab = createBottomTabNavigator();
const ContactsStack = createNativeStackNavigator<ContactsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

// 詳情頁底下有互動紀錄/AI 建議話題/AI 研究摘要三個區塊，會讀取既有真實資料——舊資料的欄位
// 形狀不一定完全符合目前的型別假設（見使用者回報：點進聯絡人詳情頁就跳出 App）。個別欄位已經
// 補上防禦，這裡再包一層 Error Boundary 當最後一道防線：即使還有沒想到的例外，畫面只會顯示
// 錯誤訊息，不會讓整個 App 被 RN 判定 fatal 直接關閉。
function ContactDetailScreenWithBoundary(props: NativeStackScreenProps<ContactsStackParamList, 'ContactDetail'>) {
  return (
    <ErrorBoundary>
      <ContactDetailScreen {...props} />
    </ErrorBoundary>
  );
}

/** 對應 Web 版的 /contacts、/contacts/:contactId 路由（見 spec.md §11.5）。 */
function ContactsNavigator() {
  const { t } = useTranslation();
  return (
    <ContactsStack.Navigator>
      <ContactsStack.Screen name="ContactsList" component={ContactsListScreen} options={{ title: t('contacts.title') }} />
      <ContactsStack.Screen name="ContactDetail" component={ContactDetailScreenWithBoundary} options={{ title: t('editContact.title', { name: '' }) }} />
      <ContactsStack.Screen name="AddContact" component={AddContactScreen} options={{ title: t('contacts.addContact') }} />
      <ContactsStack.Screen name="TagsManager" component={TagsManagerScreen} options={{ title: t('tags.title') }} />
      <ContactsStack.Screen name="BusinessCardScan" component={BusinessCardScanScreen} options={{ title: t('businessCard.title') }} />
      <ContactsStack.Screen name="QuickCapture" component={QuickCaptureScreen} options={{ title: t('quickCapture.title') }} />
      <ContactsStack.Screen name="DocumentImport" component={DocumentImportScreen} options={{ title: t('docImport.title') }} />
      <ContactsStack.Screen name="ImportContacts" component={ImportContactsScreen} options={{ title: t('import.title') }} />
    </ContactsStack.Navigator>
  );
}

/** 對應 Web 版的 /settings 路由。 */
function SettingsNavigator() {
  const { t } = useTranslation();
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} options={{ title: t('settings.title') }} />
      <SettingsStack.Screen name="OperationLog" component={OperationLogScreen} options={{ title: t('operationLog.title') }} />
    </SettingsStack.Navigator>
  );
}

// 對應 spec.md §11.2 底部導覽（見 Web 版 NavShell.tsx 的 HomeIcon/PeopleIcon/ChatIcon/SettingsIcon）。
// 之前漏了這個設定，React Navigation 沒拿到圖示元件時會自己套一個預設佔位圖形。
const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  Contacts: 'account-group',
  Assistant: 'chat',
  Settings: 'cog',
};

function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          const base = TAB_ICONS[route.name];
          const name = focused ? base : `${base}-outline`;
          return <MaterialCommunityIcons name={name as never} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: t('nav.home') }} />
      <Tab.Screen
        name="Contacts"
        component={ContactsNavigator}
        options={{ title: t('nav.contacts'), headerShown: false }}
      />
      <Tab.Screen name="Assistant" component={AssistantChatScreen} options={{ title: t('nav.assistant') }} />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{ title: t('nav.settings'), headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, initializing, init } = useAuthStore();

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);

  return (
    // react-native-paper 預設用 react-native-vector-icons 畫圖示，這個套件的字型檔在我們的
    // expo prebuild 流程裡沒有正確連結進 iOS binary（真機截圖裡所有圖示都變成 "?" 方框）。
    // 改成明確指定用 @expo/vector-icons——這套字型是 Expo 自己管理、保證會正確打包。
    <PaperProvider theme={theme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
      <NavigationContainer>
        {initializing ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : user ? (
          <MainTabs />
        ) : (
          <LoginScreen />
        )}
      </NavigationContainer>
      <StatusBar style="auto" />
    </PaperProvider>
  );
}
