import type { ContactFormValues } from '@ui/components/ContactFormFields';

export type ContactsStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  // 名片辨識（BusinessCardScan）掃描完之後不再自己直接儲存，改成帶著辨識出的欄位導到這裡，
  // 走跟手動新增聯絡人完全一樣的完整表單 + 明確儲存按鈕（見使用者要求：先填到新聯絡人、
  // 確認完所有資料再儲存，不要掃描完就直接寫入）。pendingPhotoUri 是掃描用的那張照片
  // （已裁切成只留名片本身），存檔成功拿到 contactId 後才會真的上傳（見使用者要求：
  // 這張名片照片要自動存進這位聯絡人的照片集）。
  AddContact: { initialValues?: Partial<ContactFormValues>; pendingPhotoUri?: string } | undefined;
  TagsManager: undefined;
  BusinessCardScan: undefined;
  QuickCapture: undefined;
  DocumentImport: undefined;
  ImportContacts: undefined;
};
