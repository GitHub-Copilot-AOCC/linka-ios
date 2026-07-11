import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { PaperProvider, ActivityIndicator, IconButton } from 'react-native-paper';
import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import '@ui/i18n';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@ui/store/authStore';
import { theme } from '@ui/theme/theme';
import { AppIcon } from '@ui/components/AppIcon';
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
      <ContactsStack.Screen
        name="ContactsList"
        component={ContactsListScreen}
        options={({ navigation }) => ({
          title: t('contacts.title'),
          // 原本這裡有 headerLargeTitle:true（大標題)——native-stack 的大標題收合機制是
          // 靠追蹤畫面裡「唯一一個」UIScrollView 的捲動位置來決定要不要收合，這個畫面最上面
          // 是搜尋列/排序/標籤篩選，是獨立的 View，不是跟下面的 FlatList 同一個捲動容器，
          // 導覽列因此进入不正常的狀態，把搜尋列跟名片辨識等按鈕整個往上推去蓋住狀態列
          // （見使用者截圖：畫面最上方被遮住,搜尋跟名片辨識按不到)。拿掉大標題,改回一般
          // 固定高度的標題列,犧牲一點視覺效果換回可以正常操作。
          // 「+」從原本浮動 FAB 移到 nav bar 右上角（視覺重新設計，見使用者提供的 mockup +
          // iOS 原生慣例），畫面上只留「✨」快速記錄一個 FAB。
          headerRight: () => <IconButton icon="plus" onPress={() => navigation.navigate('AddContact')} />,
        })}
      />
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
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: t('settings.title'), headerLargeTitle: true }}
      />
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

// Contacts/Settings tab 底下是巢狀 Stack——只有停在最上層的 List/Main 畫面才顯示浮動
// Tab Bar；一旦推進到詳情/編輯等下層畫面，把 Tab Bar 整個隱藏（display:'none'），不是
// 只是視覺上蓋住。之前用 position:'absolute' 讓 Tab Bar 浮起來做毛玻璃效果，副作用是
// 底層畫面失去了原本 Tab Bar 佔用的版面空間保留，導致最下方的按鈕/輸入框被浮動的 Tab
// Bar 蓋住點不到（見使用者回報：聯絡人詳情頁「蒐集網路資料」按鈕被擋住）。深層畫面直接
// 隱藏 Tab Bar 是 iOS 原生慣例（推進到編輯頁通常本來就不會再顯示底部導覽），一次徹底解決。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nestedTabBarStyle(route: any, listRouteName: string) {
  const routeName = getFocusedRouteNameFromRoute(route) ?? listRouteName;
  return routeName === listRouteName ? { position: 'absolute' as const } : { display: 'none' as const };
}

function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          const base = TAB_ICONS[route.name];
          const name = focused ? base : `${base}-outline`;
          return <AppIcon name={name} color={color} size={size} />;
        },
        // 半透明毛玻璃 Tab Bar（見使用者提供的 mockup 規格：Apple Intelligence 風格），
        // 底部導覽列本來就是浮在內容上，符合套用毛玻璃材質的前提。
        tabBarStyle: { position: 'absolute' },
        tabBarBackground: () => <BlurView intensity={80} tint="light" style={{ flex: 1 }} />,
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: t('nav.home') }} />
      <Tab.Screen
        name="Contacts"
        component={ContactsNavigator}
        options={({ route }) => ({
          title: t('nav.contacts'),
          headerShown: false,
          tabBarStyle: nestedTabBarStyle(route, 'ContactsList'),
        })}
      />
      <Tab.Screen name="Assistant" component={AssistantChatScreen} options={{ title: t('nav.assistant') }} />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={({ route }) => ({
          title: t('nav.settings'),
          headerShown: false,
          tabBarStyle: nestedTabBarStyle(route, 'SettingsMain'),
        })}
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
    // React Navigation 官方要求整個 App 要包在 SafeAreaProvider 裡（見官方文件),沒有
    // 這一層,safe area inset 在某些情況下會算成 0,導覽列的高度/位置計算就會出錯——這正是
    // 使用者截圖回報的問題：聯絡人列表最上方的搜尋列、名片辨識按鈕，還有 nav bar 的「+」，
    // 全部往上疊到狀態列的位置，點不到。之前先猜是 headerLargeTitle 的捲動追蹤問題,拿掉
    // 後畫面依然不對，才回頭發現這一層根本沒接，才是真正的根因。
    <SafeAreaProvider>
      {/* AppIcon 是一個混合 renderer：查得到 SF Symbol 對照就畫 SF Symbol（視覺重新設計，
          見 sfSymbols.ts），查不到（react-native-paper 內建圖示、品牌 logo 等）就照舊退回
          @expo/vector-icons 的 MaterialCommunityIcons——這套字型是 Expo 自己管理、保證會
          正確打包進 iOS binary（先前真機截圖回報過圖示變成 "?" 方框，就是字型沒打包的問題）。 */}
      <PaperProvider theme={theme} settings={{ icon: AppIcon }}>
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
    </SafeAreaProvider>
  );
}
