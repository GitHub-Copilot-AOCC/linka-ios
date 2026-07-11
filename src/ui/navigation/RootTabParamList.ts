import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ContactsStackParamList } from './ContactsStackParamList';
import type { SettingsStackParamList } from './SettingsStackParamList';

// Contacts/Settings 底下是巢狀 Stack（見 App.tsx），要從其他 Tab（例如 AI 秘書問答）
// 導覽到 ContactDetail 這種深層畫面，需要這份型別讓 navigation.navigate('Contacts',
// {screen:'ContactDetail', params:{contactId}}) 這種跨 Tab 巢狀導覽有型別檢查。
export type RootTabParamList = {
  Home: undefined;
  Contacts: NavigatorScreenParams<ContactsStackParamList>;
  Assistant: undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};
