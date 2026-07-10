import { create } from 'zustand';
import type { AgentSuggestion } from '@domain/agentSuggestion';
import type { InteractionType } from '@domain/interaction';
import { todayDateString } from '@domain/interaction';
import { subscribeSuggestions, updateSuggestionStatus } from '@data/suggestionsRepository';
import { createInteraction } from '@data/interactionsRepository';
import { updateContact } from '@data/contactsRepository';
import { createLogEntry } from '@data/logsRepository';

interface CompleteSuggestionInput {
  interactionType: InteractionType;
  description: string;
  date: string;
  nextContactReminder?: string;
}

interface SuggestionsState {
  suggestions: AgentSuggestion[];
  subscribe: (uid: string) => () => void;
  dismiss: (uid: string, suggestionId: string) => Promise<void>;
  complete: (
    uid: string,
    suggestion: AgentSuggestion,
    contactName: string,
    input?: Partial<CompleteSuggestionInput>
  ) => Promise<void>;
}

/**
 * Port 自 Web 版 src/ui/store/suggestionsStore.ts（見 spec.md §5.6 AI 主動提醒）。
 * 純業務邏輯、不碰任何平台 API，跟 Web 版逐字一致，這次視覺重新設計才第一次把
 * 這份資料接上 iOS 版的 UI（見 DashboardScreen.tsx / AISuggestionsPanel.tsx）。
 */
export const useSuggestionsStore = create<SuggestionsState>((set) => ({
  suggestions: [],

  subscribe: (uid) => {
    return subscribeSuggestions(uid, (suggestions) => set({ suggestions }));
  },

  dismiss: async (uid, suggestionId) => {
    await updateSuggestionStatus(uid, suggestionId, 'dismissed');
  },

  complete: async (uid, suggestion, contactName, input) => {
    const interactionType = input?.interactionType ?? 'call';
    const description = input?.description?.trim() || `已採納 AI 建議：${suggestion.message}`;
    const date = input?.date ?? todayDateString();

    await createInteraction(uid, {
      contactIds: [suggestion.contactId],
      type: interactionType,
      description,
      date,
      source: 'manual',
    });

    if (suggestion.type === 'manual_reminder_due') {
      await updateContact(uid, suggestion.contactId, {
        nextContactReminder: input?.nextContactReminder,
      });
    } else if (input?.nextContactReminder) {
      await updateContact(uid, suggestion.contactId, {
        nextContactReminder: input.nextContactReminder,
      });
    }

    await updateSuggestionStatus(uid, suggestion.id, 'done');
    createLogEntry(uid, {
      action: '採納 AI 建議',
      contactName,
      type: 'interaction',
      details: description,
    }).catch((err) => console.error('createLogEntry failed:', err));
  },
}));
