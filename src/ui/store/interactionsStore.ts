import { create } from 'zustand';
import type { Interaction, NewInteractionInput } from '@domain/interaction';
import { validateInteraction } from '@domain/interaction';
import {
  subscribeInteractionsForContact,
  subscribeAllInteractions,
  createInteraction,
  deleteInteraction,
} from '@data/interactionsRepository';
import { createLogEntry } from '@data/logsRepository';

// 給尚未載入資料的聯絡人當 selector 的預設值用——一定要是同一個參照,不能每次呼叫都
// `?? []` 生一個新陣列。zustand 用 useSyncExternalStore,每次 render 都會重新呼叫
// selector 比對前後結果是否相同;如果每次都回傳新的陣列參照,React 18 會判定「還在跑」
// 一直重新 render,直到打到 Maximum update depth exceeded(見使用者回報：點進聯絡人
// 詳情頁瞬間當機——這是唯一用到這個 fallback 寫法的兩處，且都只出現在詳情頁)。
export const EMPTY_INTERACTIONS: Interaction[] = [];

interface InteractionsState {
  byContactId: Record<string, Interaction[]>;
  all: Interaction[];
  subscribe: (uid: string, contactId: string) => () => void;
  subscribeAll: (uid: string) => () => void;
  add: (
    uid: string,
    input: NewInteractionInput,
    contactName: string
  ) => Promise<{ ok: boolean; errors?: Record<string, string> }>;
  remove: (uid: string, interactionId: string) => Promise<void>;
}

export const useInteractionsStore = create<InteractionsState>((set) => ({
  byContactId: {},
  all: [],

  subscribe: (uid, contactId) => {
    return subscribeInteractionsForContact(uid, contactId, (interactions) => {
      set((state) => ({ byContactId: { ...state.byContactId, [contactId]: interactions } }));
    });
  },

  subscribeAll: (uid) => {
    return subscribeAllInteractions(uid, (interactions) => set({ all: interactions }));
  },

  add: async (uid, input, contactName) => {
    const result = validateInteraction(input);
    if (!result.valid) {
      return { ok: false, errors: result.errors as Record<string, string> };
    }
    await createInteraction(uid, input);
    createLogEntry(uid, {
      action: '新增互動紀錄',
      contactName,
      type: 'interaction',
      details: input.description,
    }).catch((err) => console.error('createLogEntry failed:', err));
    return { ok: true };
  },

  remove: async (uid, interactionId) => {
    await deleteInteraction(uid, interactionId);
  },
}));
