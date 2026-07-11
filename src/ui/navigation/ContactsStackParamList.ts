import type { ContactFormValues } from '@ui/components/ContactFormFields';

export type ContactsStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  // 名片辨識（BusinessCardScan）掃描完之後不再自己直接儲存，改成帶著辨識出的欄位導到這裡，
  // 走跟手動新增聯絡人完全一樣的完整表單 + 明確儲存按鈕（見使用者要求：先填到新聯絡人、
  // 確認完所有資料再儲存，不要掃描完就直接寫入）。
  AddContact: { initialValues?: Partial<ContactFormValues> } | undefined;
  TagsManager: undefined;
  BusinessCardScan: undefined;
  QuickCapture: undefined;
  DocumentImport: undefined;
  ImportContacts: undefined;
};
