import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

const CATEGORIES = ['전체', '상의', '하의', '아우터', '신발', '악세사리'];

export function RecommendFilter({ activeFilter, onFilterChange }: { 
  activeFilter: string, 
  onFilterChange: (cat: string) => void 
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
      {CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat}
          onPress={() => onFilterChange(cat)}
          style={[styles.filterChip, activeFilter === cat && styles.activeFilterChip]}
        >
          <Text style={[styles.filterChipText, activeFilter === cat && styles.activeFilterChipText]}>
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filterBar: { flexDirection: 'row', marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  activeFilterChip: { backgroundColor: '#111827', borderColor: '#111827' },
  filterChipText: { color: '#4B5563', fontWeight: '600', fontSize: 13 },
  activeFilterChipText: { color: '#FFFFFF' },
});