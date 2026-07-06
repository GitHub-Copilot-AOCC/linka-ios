import { View, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { useTagsStore } from '@ui/store/tagsStore';

interface TagMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * 標籤複選（見 spec.md §5.2）：對應 Web 版 TagMultiSelect，先不做色彩/圖示 palette
 * （那是 Web 版視覺細節，不影響功能），純粹用 react-native-paper Chip 的 selected 樣式。
 */
export function TagMultiSelect({ selectedIds, onChange }: TagMultiSelectProps) {
  const tags = useTagsStore((s) => s.tags);

  function toggle(tagId: string) {
    onChange(selectedIds.includes(tagId) ? selectedIds.filter((id) => id !== tagId) : [...selectedIds, tagId]);
  }

  return (
    <View style={styles.row}>
      {tags.map((tag) => (
        <Chip key={tag.id} selected={selectedIds.includes(tag.id)} onPress={() => toggle(tag.id)} style={styles.chip}>
          {tag.name}
        </Chip>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { marginRight: 4 },
});
