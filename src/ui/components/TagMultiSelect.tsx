import { View, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { useTagsStore } from '@ui/store/tagsStore';
import { tagStyleFor } from '@ui/theme/tagPalette';

interface TagMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/** 標籤複選（見 spec.md §5.2）：對應 Web 版 TagMultiSelect，每個標籤有固定的顏色+icon（tagPalette）。 */
export function TagMultiSelect({ selectedIds, onChange }: TagMultiSelectProps) {
  const tags = useTagsStore((s) => s.tags);

  function toggle(tagId: string) {
    onChange(selectedIds.includes(tagId) ? selectedIds.filter((id) => id !== tagId) : [...selectedIds, tagId]);
  }

  return (
    <View style={styles.row}>
      {tags.map((tag) => {
        const style = tagStyleFor(tag.id);
        return (
          <Chip
            key={tag.id}
            icon={style.icon}
            selected={selectedIds.includes(tag.id)}
            onPress={() => toggle(tag.id)}
            style={[styles.chip, { backgroundColor: style.bg }]}
            textStyle={{ color: style.fg }}
          >
            {tag.name}
          </Chip>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { marginRight: 4 },
});
