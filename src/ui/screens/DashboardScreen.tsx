import { useEffect } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, List, Avatar, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import {
  isReminderDue,
  sortByReminderDate,
  upcomingBirthdays,
  recentContacts,
} from '@domain/contact';
import { recentInteractions, todayDateString } from '@domain/interaction';
import { useAuthStore } from '@ui/store/authStore';
import { useContactsStore } from '@ui/store/contactsStore';
import { useInteractionsStore } from '@ui/store/interactionsStore';

/**
 * 首頁摘要（見 spec.md §5.4、§11.3）：手動提醒待辦 + 即將到來的生日 + 最近新增/互動，
 * 四個面板都遵循 Web 版「沒有資料就不顯示」原則。AI 主動提醒面板留給後續 Phase（需要
 * Cloud Function 產生的 AgentSuggestion，跟這裡純前端算的到期提醒是分開的兩個功能）。
 */
export function DashboardScreen() {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid);
  const contacts = useContactsStore((s) => s.contacts);
  const subscribeContacts = useContactsStore((s) => s.subscribe);
  const allInteractions = useInteractionsStore((s) => s.all);
  const subscribeAllInteractions = useInteractionsStore((s) => s.subscribeAll);

  useEffect(() => {
    if (!uid) return;
    const unsubContacts = subscribeContacts(uid);
    const unsubInteractions = subscribeAllInteractions(uid);
    return () => {
      unsubContacts();
      unsubInteractions();
    };
  }, [uid, subscribeContacts, subscribeAllInteractions]);

  const today = todayDateString();
  const dueContacts = sortByReminderDate(contacts.filter((c) => isReminderDue(c, today)));
  const birthdays = upcomingBirthdays(contacts, today);
  const recent = recentContacts(contacts);
  const recentInter = recentInteractions(allInteractions);
  const contactLookup = new Map(contacts.map((c) => [c.id, c]));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.pageTitle}>
        {t('dashboard.title')}
      </Text>

      {dueContacts.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium">{t('reminders.title')}</Text>
          {dueContacts.map((c) => (
            <List.Item
              key={c.id}
              title={c.name}
              description={t('reminders.dateLabel', { date: c.nextContactReminder })}
              left={() => <Avatar.Text size={36} label={c.name.slice(0, 1)} />}
            />
          ))}
        </View>
      )}

      {birthdays.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium">{t('dashboard.upcomingBirthdaysTitle')}</Text>
          {birthdays.map(({ contact, daysUntil }) => (
            <List.Item
              key={contact.id}
              title={contact.name}
              description={daysUntil === 0 ? t('dashboard.birthdayToday') : t('dashboard.daysUntilBirthday', { days: daysUntil })}
              left={() => <Avatar.Text size={36} label={contact.name.slice(0, 1)} />}
            />
          ))}
        </View>
      )}

      {recent.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium">{t('dashboard.recentContactsTitle')}</Text>
          {recent.map((c) => (
            <List.Item
              key={c.id}
              title={c.name}
              description={c.company}
              left={() => <Avatar.Text size={36} label={c.name.slice(0, 1)} />}
            />
          ))}
        </View>
      )}

      {recentInter.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium">{t('dashboard.recentInteractionsTitle')}</Text>
          {recentInter.map((interaction) => {
            const names = interaction.contactIds
              .map((id) => contactLookup.get(id)?.name ?? t('common.deletedContact'))
              .join('、');
            return (
              <List.Item
                key={interaction.id}
                title={names}
                description={`${interaction.description} · ${interaction.date}`}
              />
            );
          })}
        </View>
      )}

      {dueContacts.length === 0 && birthdays.length === 0 && recent.length === 0 && recentInter.length === 0 && (
        <Text style={styles.empty}>{t('dashboard.noReminders')}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  pageTitle: { marginBottom: 16 },
  section: { marginBottom: 24 },
  empty: { color: '#666' },
});
