import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ClothesTags, EMPTY_TAGS, TAG_OPTIONS, useCloset } from './_closetStore';

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clothes, updateClothes } = useCloset();

  const item = clothes.find((clothesItem) => clothesItem.id === id);
  const [selected, setSelected] = useState<ClothesTags>(item?.tags ?? EMPTY_TAGS);

  const fitOptions = useMemo(() => {
    if (selected.category === '상의') return [...TAG_OPTIONS.topFit];
    if (selected.category === '하의') return [...TAG_OPTIONS.bottomFit];
    return [];
  }, [selected.category]);

  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>데이터가 없습니다.</Text>
      </View>
    );
  }

  const toggleTag = <K extends keyof ClothesTags>(key: K, value: ClothesTags[K]) => {
    setSelected((prev) => {
      const next = prev[key] === value ? '' : value;

      if (key === 'category') {
        return {
          ...prev,
          category: next as ClothesTags['category'],
          topFit: '',
          bottomFit: '',
        };
      }

      return { ...prev, [key]: next };
    });
  };

  const renderChips = <K extends keyof ClothesTags>(items: readonly string[], key: K) => (
    <View style={styles.chipWrap}>
      {items.map((itemLabel) => (
        <Chip
          key={`${String(key)}-${itemLabel}`}
          label={itemLabel}
          selected={selected[key] === itemLabel}
          onPress={() => toggleTag(key, itemLabel as ClothesTags[K])}
        />
      ))}
    </View>
  );

  const handleSave = () => {
    if (!selected.category) {
      Alert.alert('입력 확인', '카테고리를 선택해주세요.');
      return;
    }

    if (selected.category === '상의' && !selected.topFit) {
      Alert.alert('입력 확인', '상의 핏을 선택해주세요.');
      return;
    }

    if (selected.category === '하의' && !selected.bottomFit) {
      Alert.alert('입력 확인', '하의 핏을 선택해주세요.');
      return;
    }

    updateClothes(item.id, { tags: selected });
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>옷 수정</Text>

      <Image source={{ uri: item.image }} style={styles.image} />

      <Text style={styles.sectionTitle}>카테고리</Text>
      {renderChips(TAG_OPTIONS.category, 'category')}

      {fitOptions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            {selected.category === '상의' ? '상의 핏' : '하의 핏'}
          </Text>
          {selected.category === '상의' && renderChips(TAG_OPTIONS.topFit, 'topFit')}
          {selected.category === '하의' && renderChips(TAG_OPTIONS.bottomFit, 'bottomFit')}
        </>
      )}

      <Text style={styles.sectionTitle}>색</Text>
      {renderChips(TAG_OPTIONS.color, 'color')}

      <Text style={styles.sectionTitle}>계절</Text>
      {renderChips(TAG_OPTIONS.season, 'season')}

      <Text style={styles.sectionTitle}>톤</Text>
      {renderChips(TAG_OPTIONS.tone, 'tone')}

      <Text style={styles.sectionTitle}>스타일</Text>
      {renderChips(TAG_OPTIONS.style, 'style')}

      <Text style={styles.sectionTitle}>분위기</Text>
      {renderChips(TAG_OPTIONS.mood, 'mood')}

      <Text style={styles.sectionTitle}>소재</Text>
      {renderChips(TAG_OPTIONS.material, 'material')}

      <Text style={styles.sectionTitle}>두께</Text>
      {renderChips(TAG_OPTIONS.thickness, 'thickness')}

      <Text style={styles.sectionTitle}>포인트</Text>
      {renderChips(TAG_OPTIONS.point, 'point')}

      <Text style={styles.sectionTitle}>TPO</Text>
      {renderChips(TAG_OPTIONS.tpo, 'tpo')}

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>수정 완료</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  emptyText: { color: '#6b7280', fontSize: 15 },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 16 },
  image: { width: '100%', height: 220, borderRadius: 16, marginBottom: 20, backgroundColor: '#f3f4f6' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 10, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: '#111827' },
  chipText: { color: '#111827' },
  chipTextSelected: { color: '#fff' },
  button: {
    marginTop: 18,
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});