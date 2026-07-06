import { useEffect } from 'react';
import { Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSyncStatusStore } from '@ui/store/syncStatusStore';

const ICON = { offline: 'cloud-off-outline', syncing: 'cloud-sync-outline', synced: 'cloud-check-outline' } as const;

/** 離線/同步狀態指示（見 spec.md §5.11、§11.7）：安靜地存在，只用小圖示+文字，不彈窗打斷操作。 */
export function SyncStatusChip() {
  const { status, init } = useSyncStatusStore();
  const { t } = useTranslation();

  useEffect(() => init(), [init]);

  return (
    <Chip icon={ICON[status]} compact>
      {t(`syncStatus.${status}`)}
    </Chip>
  );
}
