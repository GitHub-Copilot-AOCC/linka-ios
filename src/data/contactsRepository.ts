import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import type { Contact, ContactPhoto, NewContactInput, ResearchEntry } from '@domain/contact';
import { applyContactDefaults } from '@domain/contact';

// Firestore 路徑：users/{uid}/contacts/{contactId}（見 spec.md §7）

function contactsCollection(uid: string) {
  if (!db) throw new Error('Firestore is not configured');
  return collection(db, 'users', uid, 'contacts');
}

function fromFirestore(id: string, data: Record<string, unknown>): Contact {
  const toMillis = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : (v as number) ?? Date.now());
  return {
    id,
    name: data.name as string,
    role: data.role as string | undefined,
    company: data.company as string | undefined,
    phone: data.phone as string | undefined,
    email: data.email as string | undefined,
    birthday: data.birthday as string | undefined,
    linkedin: data.linkedin as string | undefined,
    facebook: data.facebook as string | undefined,
    twitter: data.twitter as string | undefined,
    notes: data.notes as string | undefined,
    tags: (data.tags as string[]) ?? undefined,
    importance: (data.importance as Contact['importance']) ?? 3,
    photos: (data.photos as Contact['photos']) ?? undefined,
    nextContactReminder: data.nextContactReminder as string | undefined,
    source: data.source as Contact['source'],
    // 較早期寫入的研究紀錄可能沒有 sourceUrls 欄位，沒有預設值的話畫面渲染時對 undefined
    // 呼叫 .length 會直接炸掉（見使用者回報：點進聯絡人詳情頁就跳出 App）。
    researchLog: (data.researchLog as ResearchEntry[] | undefined)?.map((entry) => ({
      ...entry,
      sourceUrls: entry.sourceUrls ?? [],
    })),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

/** 訂閱使用者的聯絡人列表（依姓名排序），供 UI store 使用；回傳取消訂閱函式。 */
export function subscribeContacts(uid: string, onChange: (contacts: Contact[]) => void): () => void {
  const q = query(contactsCollection(uid), orderBy('name'));
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((d) => fromFirestore(d.id, d.data())));
    },
    (error) => console.error('[subscribeContacts] Firestore error:', error)
  );
}

export async function createContact(uid: string, input: NewContactInput): Promise<string> {
  const contact = applyContactDefaults(input);
  const ref = await addDoc(contactsCollection(uid), contact);
  return ref.id;
}

export async function updateContact(
  uid: string,
  contactId: string,
  patch: Partial<Omit<Contact, 'id' | 'createdAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore is not configured');
  // 呼叫端傳入 undefined 代表「清除這個欄位」，轉成 Firestore 的 deleteField()
  // sentinel；updateDoc（不同於 addDoc/setDoc）遇到真正的 undefined 值仍會拋錯。
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    sanitized[key] = value === undefined ? deleteField() : value;
  }
  await updateDoc(doc(db, 'users', uid, 'contacts', contactId), {
    ...sanitized,
    updatedAt: Date.now(),
  });
}

/**
 * 刪除聯絡人。互動紀錄「歷史內容」刻意保留、不因刪除聯絡人而消失
 * （見 deleteContact 對話框文案：「此操作無法復原（互動紀錄不會自動刪除）」，
 * 這是既有明確對使用者承諾的行為，不能因為這次的孤兒資料清理而破壞）。
 * 這裡只清掉沒有這種保留承諾、刪除聯絡人後就完全失去意義的 AI 建議
 * （AgentSuggestion 永遠指向已不存在的聯絡人，見使用者回報的 corner case）。
 */
export async function deleteContact(uid: string, contactId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not configured');

  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', uid, 'contacts', contactId));

  const suggestionsQuery = query(
    collection(db, 'users', uid, 'suggestions'),
    where('contactId', '==', contactId)
  );
  const suggestionsSnapshot = await getDocs(suggestionsQuery);
  for (const suggestionDoc of suggestionsSnapshot.docs) {
    batch.delete(suggestionDoc.ref);
  }

  await batch.commit();
}

/**
 * 上傳聯絡人照片到 Firebase Storage（見 spec.md §5.2、§7：路徑
 * users/{uid}/contacts/{contactId}/photos/{photoId}.jpg），並把下載 URL 加進
 * Contact.photos 陣列。呼叫端負責先做 MAX_PHOTOS_PER_CONTACT 上限檢查。
 *
 * 排查記錄（見使用者兩次實測截圖，錯誤訊息完全相同："Creating blobs from 'ArrayBuffer'
 * and 'ArrayBufferView' are not supported"）：一開始懷疑是 fetch(uri).blob() 的問題，
 * 改成 base64+uploadString 之後問題依然存在——追進 @firebase/storage 原始碼才發現
 * 真正的根因是 Firebase JS SDK 的 Storage 模組本身：`uploadBytes`／`uploadString`
 * 預設都走「multipart」上傳策略，SDK 內部一律會把 metadata JSON 字串 + 檔案內容 +
 * 收尾字串三段用 `new Blob([...])` 兜成一個請求主體，不管呼叫端原本傳的是 Blob、
 * Uint8Array 還是 base64 字串都逃不掉這一步，而 React Native 的 Blob polyfill完全
 * 不支援用 ArrayBuffer/ArrayBufferView 建構 Blob，於是不管怎麼包裝資料，最後都在 SDK
 * 內部炸在同一行——這不是 Storage 權限、不是檔案本身、也不是快取被回收的問題。
 *
 * 真正解法：改用 `uploadBytesResumable`（resumable 上傳協定）——這條路徑用多次 POST
 * 分段傳輸位元組，追進原始碼確認過完全不會呼叫 `new Blob(...)`；只要餵給它的是
 * Uint8Array（不是原生 Blob 物件）即可。呼叫端改用 @platform/imageCompression 的
 * readImageAsBytes(uri) 讀檔（Expo 新版 File API 的 arrayBuffer()，不透過 base64）。
 *
 * 回傳新增的這一筆 ContactPhoto——需要連續上傳多張照片時（例如名片辨識同時裁出大頭照
 * 跟名片全圖），呼叫端要拿這個回傳值累積下一次呼叫的 existingPhotos，不能每次都傳空
 * 陣列進來，否則後面的呼叫會覆蓋掉前一張，不是附加。
 */
export async function uploadContactPhoto(
  uid: string,
  contactId: string,
  bytes: Uint8Array,
  existingPhotos: ContactPhoto[]
): Promise<ContactPhoto> {
  if (!storage) throw new Error('Firebase Storage is not configured');
  const photoId = `${Date.now()}`;
  const path = `users/${uid}/contacts/${contactId}/photos/${photoId}.jpg`;
  const fileRef = storageRef(storage, path);
  await uploadBytesResumable(fileRef, bytes, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(fileRef);

  const photo: ContactPhoto = { url, source: 'upload', addedAt: Date.now() };
  await updateContact(uid, contactId, { photos: [...existingPhotos, photo] });
  return photo;
}

/**
 * 新增一筆網路身分研究摘要紀錄（見 spec.md §5.8）：一律附加到 researchLog 陣列尾端，
 * 絕不覆蓋既有紀錄，讓使用者可回顧歷次搜尋結果隨時間的變化。
 */
export async function appendResearchEntry(
  uid: string,
  contactId: string,
  existingLog: ResearchEntry[],
  entry: ResearchEntry
): Promise<void> {
  await updateContact(uid, contactId, { researchLog: [...existingLog, entry] });
}

/** 刪除一筆研究紀錄（見使用者回報：累積的搜尋結果太佔畫面空間，需要能個別刪除）。 */
export async function removeResearchEntry(
  uid: string,
  contactId: string,
  existingLog: ResearchEntry[],
  entryId: string
): Promise<void> {
  const remaining = existingLog.filter((entry) => entry.id !== entryId);
  await updateContact(uid, contactId, { researchLog: remaining.length > 0 ? remaining : undefined });
}

/** 刪除一張已上傳的聯絡人照片（Storage 檔案 + Firestore 陣列項目）。 */
export async function removeContactPhoto(
  uid: string,
  contactId: string,
  photo: ContactPhoto,
  existingPhotos: ContactPhoto[]
): Promise<void> {
  if (storage) {
    try {
      await deleteObject(storageRef(storage, photo.url));
    } catch {
      // 用 download URL 建立 ref 在某些情況下無法直接刪除底層檔案，
      // 此時僅移除 Firestore 紀錄，不視為致命錯誤（避免留下孤兒檔案但擋住使用者操作）。
    }
  }
  const remaining = existingPhotos.filter((p) => p.addedAt !== photo.addedAt);
  await updateContact(uid, contactId, { photos: remaining.length > 0 ? remaining : undefined });
}
