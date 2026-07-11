import { useEffect, useRef } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { Text, List, IconButton, useTheme } from 'react-native-paper';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import {
  isReminderDue,
  sortByReminderDate,
  upcomingBirthdays,
  contactsAddedWithinHours,
} from '@domain/contact';
import { recentInteractions, todayDateString } from '@domain/interaction';
import { useAuthStore } from '@ui/store/authStore';
import { useContactsStore } from '@ui/store/contactsStore';
import { useInteractionsStore } from '@ui/store/interactionsStore';
import { AISuggestionsPanel } from '@ui/components/AISuggestionsPanel';
import { ContactAvatar } from '@ui/components/ContactAvatar';
import { SFIcon } from '@ui/components/AppIcon';
import { CARD_SHADOW } from '@ui/theme/theme';
import type { SFSymbol } from 'sf-symbols-typescript';

type StatKey = 'recentlyAdded' | 'recentInteractions' | 'birthdays' | 'due';

// 「最近新增」的定義（見使用者確認）：過去 72 小時內建立的聯絡人，不是「最新的 5 位」
// （不管多久以前新增的都算）——時間窗口寫在這裡，跟 contactsAddedWithinHours 的呼叫端
// 共用同一個數字，之後要調整窗口只要改這裡。
const RECENTLY_ADDED_WINDOW_HOURS = 72;

function greetingKey(hour: number): 'dashboard.greetingMorning' | 'dashboard.greetingAfternoon' | 'dashboard.greetingEvening' {
  if (hour < 12) return 'dashboard.greetingMorning';
  if (hour < 18) return 'dashboard.greetingAfternoon';
  return 'dashboard.greetingEvening';
}

/** 距離 today 幾天（today 較新則為正數），用來算「最近 7 天內」的互動次數。 */
function daysBefore(dateIso: string, today: string): number {
  const a = new Date(`${today}T00:00:00.000Z`).getTime();
  const b = new Date(`${dateIso}T00:00:00.000Z`).getTime();
  return Math.floor((a - b) / 86400000);
}

/**
 * 首頁摘要（見 spec.md §5.4、§11.3）：AI 建議 Hero 卡 + 今日摘要 2x2 統計格線 + 四個
 * 對應的清單區塊。點統計卡會捲動到畫面下方對應的清單（見使用者要求）——四個清單維持
 * Web 版「沒有資料就不顯示」原則，隱藏時對應的統計卡點了不會捲（沒有目標可捲）。
 */
export function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  // Tab Bar 改成浮動毛玻璃（position:'absolute'）之後，畫面不會自動保留底部空間，要自己
  // 用實際的 Tab Bar 高度補上 padding，不然最下面的內容會被浮動的 Tab Bar 蓋住。
  const tabBarHeight = useBottomTabBarHeight();
  const uid = useAuthStore((s) => s.user?.uid);
  const displayName = useAuthStore((s) => s.user?.displayName);
  const email = useAuthStore((s) => s.user?.email);
  const contacts = useContactsStore((s) => s.contacts);
  const subscribeContacts = useContactsStore((s) => s.subscribe);
  const allInteractions = useInteractionsStore((s) => s.all);
  const subscribeAllInteractions = useInteractionsStore((s) => s.subscribeAll);

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Partial<Record<StatKey, number>>>({});

  function registerSectionY(key: StatKey) {
    return (e: { nativeEvent: { layout: { y: number } } }) => {
      sectionY.current[key] = e.nativeEvent.layout.y;
    };
  }

  function scrollToSection(key: StatKey) {
    const y = sectionY.current[key];
    if (y === undefined) return; // 該清單目前沒有資料、沒有渲染出來，沒有目標可捲
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
  }

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
  const recentlyAdded = contactsAddedWithinHours(contacts, Date.now(), RECENTLY_ADDED_WINDOW_HOURS);
  const recentInter = recentInteractions(allInteractions);
  const recentInteractionCount = allInteractions.filter((i) => {
    const days = daysBefore(today, i.date);
    return days >= 0 && days <= 7;
  }).length;
  const contactLookup = new Map(contacts.map((c) => [c.id, c]));

  const firstName = (displayName ?? email ?? '').split(/[\s@]/)[0];
  const hour = new Date().getHours();

  const stats: Array<{ key: StatKey; icon: SFSymbol; color: string; title: string; count: number; unit: string }> = [
    {
      key: 'recentlyAdded',
      icon: 'person.crop.circle.badge.plus',
      color: theme.colors.primary,
      title: t('dashboard.newContactsStat'),
      count: recentlyAdded.length,
      unit: t('dashboard.peopleCount', { count: recentlyAdded.length }),
    },
    {
      key: 'recentInteractions',
      icon: 'bubble.left.and.bubble.right.fill',
      color: theme.colors.secondary,
      title: t('dashboard.recentInteractionsStat'),
      count: recentInteractionCount,
      unit: t('dashboard.interactionCount', { count: recentInteractionCount }),
    },
    {
      key: 'birthdays',
      icon: 'birthday.cake.fill',
      color: theme.colors.tertiary,
      title: t('dashboard.birthdaysStat'),
      count: birthdays.length,
      unit: t('dashboard.birthdayCount', { count: birthdays.length }),
    },
    {
      key: 'due',
      icon: 'star.fill',
      color: theme.colors.error,
      title: t('dashboard.dueStat'),
      count: dueContacts.length,
      unit: t('dashboard.dueCount', { count: dueContacts.length }),
    },
  ];

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + 24 }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text variant="headlineLarge">{t(greetingKey(hour), { name: firstName })}</Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('dashboard.aiReadySubtitle')}
          </Text>
        </View>
        <IconButton icon="bell" size={22} />
      </View>

      <AISuggestionsPanel uid={uid ?? ''} />

      <Text variant="titleLarge" style={styles.sectionTitle}>
        {t('dashboard.todaySummary')}
      </Text>
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <Pressable
            key={stat.key}
            onPress={() => scrollToSection(stat.key)}
            style={[styles.statCard, { backgroundColor: theme.colors.surface, borderRadius: theme.roundness }, CARD_SHADOW]}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {stat.title}
            </Text>
            <View style={styles.statValueRow}>
              <SFIcon name={stat.icon} size={20} color={stat.color} />
              <Text variant="headlineSmall" style={styles.statValue}>
                {stat.count}
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {stat.unit}
            </Text>
          </Pressable>
        ))}
      </View>

      {dueContacts.length > 0 && (
        <View style={styles.section} onLayout={registerSectionY('due')}>
          <Text variant="titleLarge">{t('reminders.title')}</Text>
          {dueContacts.map((c) => (
            <List.Item
              key={c.id}
              title={c.name}
              description={t('reminders.dateLabel', { date: c.nextContactReminder })}
              left={() => <ContactAvatar photoUrl={c.photos?.[0]?.url} name={c.name} seed={c.id} size={36} />}
            />
          ))}
        </View>
      )}

      {recentlyAdded.length > 0 && (
        <View style={styles.section} onLayout={registerSectionY('recentlyAdded')}>
          <Text variant="titleLarge">{t('dashboard.recentContactsTitle')}</Text>
          {recentlyAdded.map((c) => (
            <List.Item
              key={c.id}
              title={c.name}
              description={c.company}
              left={() => <ContactAvatar photoUrl={c.photos?.[0]?.url} name={c.name} seed={c.id} size={36} />}
            />
          ))}
        </View>
      )}

      {birthdays.length > 0 && (
        <View style={styles.section} onLayout={registerSectionY('birthdays')}>
          <Text variant="titleLarge">{t('dashboard.upcomingBirthdaysTitle')}</Text>
          {birthdays.map(({ contact, daysUntil }) => (
            <List.Item
              key={contact.id}
              title={contact.name}
              description={daysUntil === 0 ? t('dashboard.birthdayToday') : t('dashboard.daysUntilBirthday', { days: daysUntil })}
              left={() => <ContactAvatar photoUrl={contact.photos?.[0]?.url} name={contact.name} seed={contact.id} size={36} />}
            />
          ))}
        </View>
      )}

      {recentInter.length > 0 && (
        <View style={styles.section} onLayout={registerSectionY('recentInteractions')}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleLarge">{t('dashboard.recentInteractionsTitle')}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
              {t('dashboard.viewAll')}
            </Text>
          </View>
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

      {dueContacts.length === 0 && birthdays.length === 0 && recentlyAdded.length === 0 && recentInter.length === 0 && (
        <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>{t('dashboard.noReminders')}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  headerText: { flex: 1, gap: 4 },
  sectionTitle: { marginTop: 20, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%', padding: 16, gap: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontWeight: '700' },
  section: { marginTop: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { marginTop: 24 },
});
