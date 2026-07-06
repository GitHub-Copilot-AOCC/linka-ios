import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider, MD3LightTheme, ActivityIndicator } from 'react-native-paper';
import { View } from 'react-native';
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

/** 對應 Web 版的 /contacts、/contacts/:contactId 路由（見 spec.md §11.5）。 */
function ContactsNavigator() {
  const { t } = useTranslation();
  return (
    <ContactsStack.Navigator>
      <ContactsStack.Screen name="ContactsList" component={ContactsListScreen} options={{ title: t('contacts.title') }} />
      <ContactsStack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ title: t('editContact.title', { name: '' }) }} />
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

function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator>
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
    <PaperProvider theme={theme}>
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
